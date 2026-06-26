import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { gameRegistry, initializeGames, BaseGame } from './plugins/index.js';
import { createPlayerStore, PlayerStore } from './shared/stores/player-store.js';
import { createRateLimiter } from './shared/utils/rate-limiter.js';
import { resolveBindAddress } from './shared/utils/resolve-bind-addresses.js';
import { validatePlayerName, validateWord, validateCategory } from './shared/utils/input-validation.js';
import { createConnectionTracker } from './shared/utils/connection-tracker.js';
import { classifyAccessKey, AccessLevel } from './shared/utils/access-key.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize games from config (will throw on invalid config)
initializeGames();

const EXPLICIT_HOST = process.env.HOST || null;
const PORT = parseInt(process.env.PORT || '3000', 10);
const HTTPS_REQUIRED = process.env.HTTPS_REQUIRED === 'true';
const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH || path.join(__dirname, '..', '..', 'certs', 'lan-key.pem');
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH || path.join(__dirname, '..', '..', 'certs', 'lan-cert.pem');
const CLIENT_GRACE_MS = parseInt(process.env.CLIENT_GRACE_MS || '5000', 10);
const KEY_LENGTH = Math.max(6, parseInt(process.env.KEY_LENGTH || '8', 10));

const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a random access key for embedding in invite URLs.
 * @param length Length of the key to generate.
 * @returns Random key string.
 */
function randomKey(length = KEY_LENGTH): string {
  const bytes = crypto.randomBytes(length);
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += KEY_CHARS[bytes[i] % KEY_CHARS.length];
  }
  return value;
}

const ADMIN_KEY = randomKey(KEY_LENGTH);
const PLAYER_KEY = randomKey(KEY_LENGTH);

let selectedGameId = gameRegistry.getDefaultGameId() || '';
let gameInstance: BaseGame | null = null;
const sseClients = new Set<Response>();
const sseTracker = createConnectionTracker(5, 50);
const authRateLimiter = createRateLimiter(10, 60_000);
const sharedPlayerStore = createPlayerStore();

/**
 * Ensure a game instance is initialized for the given game id.
 * @param gameId Game identifier to load.
 * @returns True when a game instance is active.
 */
function ensureGame(gameId: string): boolean {
  const definition = gameRegistry.getGame(gameId);
  if (!definition) {
    return false;
  }
  if (gameInstance && typeof gameInstance.dispose === 'function') {
    gameInstance.dispose();
  }
  selectedGameId = gameId;
  gameInstance = definition.factory({
    clientGraceMs: CLIENT_GRACE_MS,
    onStateChange: broadcastState,
    playerStore: sharedPlayerStore,
  });
  return true;
}

/**
 * Activate the default game if needed.
 */
function enableDefaultGame(): void {
  if (!ensureGame(selectedGameId)) {
    selectedGameId = gameRegistry.getDefaultGameId() || '';
    if (selectedGameId) {
      ensureGame(selectedGameId);
    }
  }
}

enableDefaultGame();

/**
 * Load TLS key/cert pair if present.
 * @returns TLS config or null when not available.
 */
function loadTlsConfig(): { key: Buffer; cert: Buffer } | null {
  try {
    const key = fs.readFileSync(HTTPS_KEY_PATH);
    const cert = fs.readFileSync(HTTPS_CERT_PATH);
    return { key, cert };
  } catch {
    return null;
  }
}

/**
 * Check if an IP address is private/LAN.
 * @param address IP address string.
 * @returns True if the address is private.
 */
function isPrivateIp(address: string | undefined): boolean {
  if (!address) {
    return false;
  }
  let ip = address;
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }
  if (ip === '127.0.0.1' || ip === '::1') {
    return true;
  }
  if (ip.startsWith('fd') || ip.startsWith('fc') || ip.startsWith('fe80:')) {
    return true;
  }
  const parts = ip.split('.').map((part) => parseInt(part, 10));
  if (parts.length === 4) {
    if (parts[0] === 10) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  }
  return false;
}

/**
 * Score a network interface entry so the most likely user-facing LAN
 * address sorts first. Higher score = more likely to be the right one.
 * @param name OS interface name (e.g. "wlan0", "eth0", "docker0").
 * @param address IPv4 address string.
 * @returns Numeric score.
 */
function scoreLanInterface(name: string, address: string): number {
  const lower = name.toLowerCase();
  let score = 0;

  // Prefer WiFi interfaces (most common for mobile / laptop)
  if (/^(wlan|wlp|wi-?fi|en0$)/.test(lower)) score += 40;
  // Ethernet is good too
  else if (/^(eth|enp|en[1-9])/.test(lower)) score += 30;

  // Deprioritize virtual / container / VPN interfaces
  if (/^(docker|br-|veth|virbr|tun|tap|wg|tailscale|zt)/.test(lower)) score -= 50;

  // 192.168.x.x is overwhelmingly the most common home network range
  if (address.startsWith('192.168.')) score += 20;
  // 10.x.x.x is often VPN / mobile hotspot / enterprise
  else if (address.startsWith('10.')) score += 5;

  // Addresses ending in .1 are typically gateways or hotspot hosts
  if (address.endsWith('.1')) score -= 15;

  return score;
}

/**
 * Get all LAN IPv4 addresses for this host, sorted so the most likely
 * user-facing address is first.
 * @returns Array of LAN IP addresses.
 */
function getLanAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const entries: { name: string; address: string; score: number }[] = [];
  for (const [name, ifaceEntries] of Object.entries(interfaces)) {
    for (const entry of ifaceEntries || []) {
      if (entry.family !== 'IPv4' || entry.internal) {
        continue;
      }
      if (isPrivateIp(entry.address)) {
        entries.push({
          name,
          address: entry.address,
          score: scoreLanInterface(name, entry.address),
        });
      }
    }
  }
  entries.sort((a, b) => b.score - a.score);
  return Array.from(new Set(entries.map((e) => e.address)));
}

/**
 * Count the number of leading 1-bits in a dotted-decimal netmask.
 * @param netmask Dotted-decimal netmask (e.g. "255.255.255.0").
 * @returns CIDR prefix length (e.g. 24), or 0 if invalid.
 */
function netmaskToCidr(netmask: string): number {
  const parts = netmask.split('.').map(Number);
  if (parts.length !== 4) return 0;
  let bits = 0;
  for (const octet of parts) {
    bits += (octet >>> 0).toString(2).split('1').length - 1;
  }
  return bits;
}

/**
 * Warn if any private interface is on a suspiciously large subnet.
 * Home networks are typically /24 (254 hosts). Subnets larger than /22
 * (~1022 hosts) suggest a public, shared, or enterprise network where
 * untrusted devices may be present.
 */
function warnIfUntrustedNetwork(): void {
  const interfaces = os.networkInterfaces();
  for (const [name, ifaceEntries] of Object.entries(interfaces)) {
    for (const entry of ifaceEntries || []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      if (!isPrivateIp(entry.address)) continue;

      const cidr = netmaskToCidr(entry.netmask);
      if (cidr > 0 && cidr < 22) {
        console.warn(
          `WARNING: Interface ${name} (${entry.address}/${cidr}) is on a large subnet.`
        );
        console.warn(
          'This may indicate a public or shared network. Ensure you trust all devices on this network.'
        );
      }
    }
  }
}

/**
 * Classify the access key carried on a request (query string first, body second).
 * @param req Express request.
 * @returns Access level the key grants, or null when missing or unknown.
 */
function classifyRequest(req: Request): AccessLevel | null {
  const fromQuery = req.query.key;
  const candidate =
    typeof fromQuery === 'string'
      ? fromQuery
      : (req.body && typeof (req.body as { key?: unknown }).key === 'string'
          ? (req.body as { key: string }).key
          : null);
  return classifyAccessKey(candidate, ADMIN_KEY, PLAYER_KEY);
}

interface PublicState {
  players: unknown[];
  round?: unknown;
  match?: unknown;
  game: { id: string; name: string };
  games: { id: string; name: string }[];
}

/**
 * Build the public state payload for clients.
 * @returns Public state snapshot.
 */
function buildPublicState(): PublicState {
  const games = gameRegistry.getEnabledGames();
  const currentGame = games[selectedGameId];
  const gameState = gameInstance
    ? (gameInstance.getState() as { players: unknown[]; round?: unknown; match?: unknown })
    : { players: [], round: {} };
  return {
    ...gameState,
    game: {
      id: selectedGameId,
      name: currentGame?.name || 'Unknown',
    },
    games: gameRegistry.listEnabledGames(),
  };
}

/**
 * Determine if a game is currently in an active phase.
 * @param game Game instance to evaluate.
 * @returns True if a round is active or voting.
 */
function isGameInProgress(game: BaseGame | null): boolean {
  if (game && typeof game.getPhase === 'function') {
    const phase = game.getPhase();
    return phase === 'active' || phase === 'voting';
  }
  return false;
}

/**
 * Broadcast the latest state to all SSE clients.
 */
function broadcastState(): void {
  const payload = JSON.stringify(buildPublicState());
  for (const client of sseClients) {
    try {
      client.write(`event: state\ndata: ${payload}\n\n`);
    } catch {
      removeSseClient(client);
    }
  }
}

/**
 * Remove an SSE client and update the connection tracker.
 * @param client The SSE response object to remove.
 */
function removeSseClient(client: Response): void {
  if (!sseClients.has(client)) return;
  const ip = (client as Response & { sseIp?: string }).sseIp || 'unknown';
  sseClients.delete(client);
  sseTracker.remove(ip);
}

// Create Express app
const app = express();
app.use(express.json({ limit: '10kb' }));

// Security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  if (HTTPS_REQUIRED) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Reject requests from non-private IPs
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!isPrivateIp(req.socket.remoteAddress)) {
    res.status(403).send('LAN access only');
    return;
  }
  next();
});

/**
 * Check rate limit for a client IP. If blocked, sends a 429 response.
 * @param req Express request.
 * @param res Express response.
 * @returns True if the request is blocked and a response was sent.
 */
function isRateLimited(req: Request, res: Response): boolean {
  const ip = req.socket.remoteAddress || 'unknown';
  const remaining = authRateLimiter.isBlocked(ip);
  if (remaining > 0) {
    res.setHeader('Retry-After', String(remaining));
    res.status(429).json({ error: 'too_many_attempts' });
    return true;
  }
  return false;
}

/**
 * Record a failed auth attempt for a client IP.
 * Logs a warning when an IP is blocked.
 * @param req Express request.
 */
function recordAuthFailure(req: Request): void {
  const ip = req.socket.remoteAddress || 'unknown';
  const justBlocked = authRateLimiter.recordFailure(ip);
  if (justBlocked) {
    console.warn(`Rate limit: ${ip} blocked for 60s after 10 failed attempts`);
  }
}

/**
 * Get the active game instance or send a 503 response.
 * @param res Express response (used to send 503 if no game is active).
 * @returns The game instance, or null if a 503 was sent.
 */
function getGameInstance(res: Response): BaseGame | null {
  if (!gameInstance) {
    res.status(503).json({ error: 'no_game_active' });
    return null;
  }
  return gameInstance;
}

/**
 * Reject a request whose key is missing or invalid for the required level.
 * Records an auth failure for rate-limiting and sends an Unauthorized response.
 * @param req Express request.
 * @param res Express response.
 * @param required Required access level ('player' allows admin too).
 * @returns True if the request was rejected (response already sent).
 */
function rejectIfUnauthorized(
  req: Request,
  res: Response,
  required: AccessLevel,
): boolean {
  if (isRateLimited(req, res)) return true;
  const level = classifyRequest(req);
  if (!level || (required === 'admin' && level !== 'admin')) {
    recordAuthFailure(req);
    res.status(401).json({ error: 'unauthorized' });
    return true;
  }
  return false;
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

// API routes
app.get('/api/state', (req: Request, res: Response) => {
  if (rejectIfUnauthorized(req, res, 'player')) return;
  res.json(buildPublicState());
});

app.get('/api/games', (req: Request, res: Response) => {
  if (rejectIfUnauthorized(req, res, 'player')) return;
  res.json({
    selectedGameId,
    games: gameRegistry.listEnabledGames(),
  });
});

app.get('/api/events', (req: Request, res: Response) => {
  if (isRateLimited(req, res)) return;
  if (!classifyRequest(req)) {
    recordAuthFailure(req);
    res.status(401).send('Unauthorized');
    return;
  }

  const clientIp = req.socket.remoteAddress || 'unknown';
  const connectResult = sseTracker.canConnect(clientIp);
  if (!connectResult.allowed) {
    const status = connectResult.reason === 'server_busy' ? 503 : 429;
    res.status(status).json({ error: connectResult.reason });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.write('\n');

  (res as Response & { sseIp?: string }).sseIp = clientIp;
  sseClients.add(res);
  sseTracker.add(clientIp);

  const payload = JSON.stringify(buildPublicState());
  res.write(`event: state\ndata: ${payload}\n\n`);

  const heartbeat = setInterval(() => {
    try {
      res.write(':heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      removeSseClient(res);
    }
  }, 30_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeSseClient(res);
  });
});

app.post('/api/players/join', (req: Request, res: Response) => {
  if (rejectIfUnauthorized(req, res, 'player')) return;
  const payload = req.body;

  const game = getGameInstance(res);
  if (!game) return;

  const nameCheck = validatePlayerName(payload.name);
  if (!nameCheck.ok) {
    res.status(400).json({ error: nameCheck.reason });
    return;
  }

  const result = game.joinPlayer({
    name: nameCheck.value,
    playerId: payload.playerId,
  });

  if (!result.ok) {
    const status = result.error === 'name_taken' ? 409 : 400;
    res.status(status).json({ error: result.error });
    return;
  }

  res.json({ playerId: result.playerId, name: result.name });
});

app.post('/api/round/submit', (req: Request, res: Response) => {
  if (rejectIfUnauthorized(req, res, 'player')) return;
  const payload = req.body;

  const game = getGameInstance(res);
  if (!game) return;

  const wordCheck = validateWord(payload.word ?? '');
  if (!wordCheck.ok) {
    res.status(400).json({ error: wordCheck.reason });
    return;
  }

  const result = game.submitWord(
    payload.playerId,
    wordCheck.value,
    payload.category
  );
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  res.json({ ...result, accepted: true });
});

app.post('/api/round/finish', (req: Request, res: Response) => {
  if (rejectIfUnauthorized(req, res, 'player')) return;
  const payload = req.body;

  const game = getGameInstance(res);
  if (!game) return;

  const roundId = parseInt(payload.roundId, 10);
  if (!Number.isFinite(roundId)) {
    res.status(400).json({ error: 'invalid_round' });
    return;
  }

  if (typeof game.finishRound !== 'function') {
    res.status(400).json({ error: 'not_supported' });
    return;
  }

  const result = game.finishRound(payload.playerId, roundId);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  res.json({ ok: true });
});

app.post('/api/round/votes', (req: Request, res: Response) => {
  if (rejectIfUnauthorized(req, res, 'player')) return;
  const payload = req.body;

  const game = getGameInstance(res);
  if (!game) return;

  let votePayload: unknown = payload;
  if (Object.prototype.hasOwnProperty.call(payload, 'downvotedWordIds')) {
    votePayload = payload.downvotedWordIds;
  } else if (Object.prototype.hasOwnProperty.call(payload, 'votes')) {
    votePayload = payload.votes;
  }
  const result = game.submitVotes(payload.playerId, votePayload);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  res.json({ ok: true });
});

app.post('/api/round/action', (req: Request, res: Response) => {
  if (rejectIfUnauthorized(req, res, 'player')) return;
  const payload = req.body;

  const game = getGameInstance(res);
  if (!game) return;

  if (typeof game.handleAction !== 'function') {
    res.status(400).json({ error: 'not_supported' });
    return;
  }

  const result = game.handleAction(payload.playerId, payload.action);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

app.post('/api/admin/start', (req: Request, res: Response) => {
  if (rejectIfUnauthorized(req, res, 'admin')) return;

  const game = getGameInstance(res);
  if (!game) return;

  const payload = req.body;
  const durationMs = parseInt(payload.durationMs, 10);
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    res.status(400).json({ error: 'invalid_duration' });
    return;
  }

  const result = game.startRound(durationMs);
  res.json(result);
});

app.post('/api/admin/category', (req: Request, res: Response) => {
  if (rejectIfUnauthorized(req, res, 'admin')) return;

  const game = getGameInstance(res);
  if (!game) return;

  const payload = req.body;
  let result: { ok: boolean; reason?: string };

  if (payload && Array.isArray(payload.categories)) {
    if (typeof game.selectCategories !== 'function') {
      res.status(400).json({ error: 'invalid_request' });
      return;
    }
    result = game.selectCategories(payload.categories);
  } else if (payload && payload.random && typeof game.selectRandomCategories === 'function') {
    result = game.selectRandomCategories(payload.count);
  } else if (payload && payload.random && typeof game.selectRandomCategory === 'function') {
    result = game.selectRandomCategory();
  } else if (payload && payload.addCustom && typeof game.addCategory === 'function') {
    const catCheck = validateCategory(payload.addCustom);
    if (!catCheck.ok) {
      res.status(400).json({ error: catCheck.reason });
      return;
    }
    result = game.addCategory(catCheck.value);
  } else if (typeof game.selectCategory === 'function') {
    result = game.selectCategory(payload.category);
  } else {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }

  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

app.post('/api/admin/game', (req: Request, res: Response) => {
  if (rejectIfUnauthorized(req, res, 'admin')) return;

  const payload = req.body;
  const gameId = payload.gameId;
  if (!gameRegistry.isEnabled(gameId)) {
    res.status(400).json({ error: 'unknown_game' });
    return;
  }

  if (isGameInProgress(gameInstance)) {
    res.status(409).json({ error: 'round_active' });
    return;
  }

  ensureGame(gameId);
  broadcastState();
  res.json({ ok: true, selectedGameId: gameId });
});

app.post('/api/admin/eject', (req: Request, res: Response) => {
  if (rejectIfUnauthorized(req, res, 'admin')) return;

  const payload = req.body;
  const playerId = payload.playerId;
  if (!playerId || typeof playerId !== 'string') {
    res.status(400).json({ error: 'invalid_player' });
    return;
  }

  if (!sharedPlayerStore.hasPlayer(playerId)) {
    res.status(404).json({ error: 'player_not_found' });
    return;
  }

  sharedPlayerStore.removePlayer(playerId);
  broadcastState();
  res.json({ ok: true });
});

app.post('/api/admin/end', (req: Request, res: Response) => {
  if (rejectIfUnauthorized(req, res, 'admin')) return;

  const game = getGameInstance(res);
  if (!game) return;

  if (typeof game.endGame !== 'function') {
    res.status(400).json({ error: 'not_supported' });
    return;
  }

  const result = game.endGame();
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  res.json({ ok: true });
});

app.post('/api/admin/settings', (req: Request, res: Response) => {
  if (rejectIfUnauthorized(req, res, 'admin')) return;

  const game = getGameInstance(res);
  if (!game) return;

  if (typeof game.updateSettings !== 'function') {
    res.status(400).json({ error: 'not_supported' });
    return;
  }

  const payload = req.body;
  if (!payload || typeof payload.settings !== 'object' || payload.settings === null) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }

  const result = game.updateSettings(payload.settings);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  res.json({ ok: true });
});

// Serve static files from frontend build in production
const frontendDistPath =
  process.env.STATIC_DIR ||              // ← mobile bridge sets this
  path.join(__dirname, '..', '..', 'frontend', 'dist');

/**
 * Send the SPA entry HTML so the React app can render based on the URL.
 * @param _req Express request.
 * @param res Express response.
 */
function serveSpa(_req: Request, res: Response): void {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
}

if (fs.existsSync(frontendDistPath)) {
  // Built JS/CSS/images live under /assets/
  app.use('/assets', express.static(path.join(frontendDistPath, 'assets')));

  // Common root-level static files
  const rootStatics = ['/favicon.ico', '/favicon.svg', '/robots.txt', '/manifest.json'];
  app.get(rootStatics, (req: Request, res: Response, next: NextFunction) => {
    res.sendFile(path.join(frontendDistPath, req.path.slice(1)), (err) => {
      if (err) next();
    });
  });

  // Landing pages: the SPA renders an "Use your invite link" message
  app.get(['/', '/admin'], serveSpa);

  // Player invite link
  app.get('/p/:key', (req: Request, res: Response) => {
    if (isRateLimited(req, res)) return;
    if (!classifyAccessKey(req.params.key, ADMIN_KEY, PLAYER_KEY)) {
      recordAuthFailure(req);
    }
    serveSpa(req, res);
  });

  // Admin invite link
  app.get('/admin/:key', (req: Request, res: Response) => {
    if (isRateLimited(req, res)) return;
    if (classifyAccessKey(req.params.key, ADMIN_KEY, PLAYER_KEY) !== 'admin') {
      recordAuthFailure(req);
    }
    serveSpa(req, res);
  });
}

// Anything else is treated as a probe / bad URL: rate-limited and 404.
app.use((req: Request, res: Response) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (isRateLimited(req, res)) return;
  recordAuthFailure(req);
  res.status(404).send('Not found');
});

// Global error handler — catches unhandled route errors and returns
// a generic JSON response without leaking stack traces or file paths.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
});

// Create server
const tlsConfig = HTTPS_REQUIRED ? loadTlsConfig() : null;
if (HTTPS_REQUIRED && !tlsConfig) {
  console.error('HTTPS is required but certificate files were not found.');
  console.error(`Expected key: ${HTTPS_KEY_PATH}`);
  console.error(`Expected cert: ${HTTPS_CERT_PATH}`);
  console.error('Generate a trusted LAN cert before starting the server.');
  process.exit(1);
}

/**
 * Create an HTTP or HTTPS server for the Express app.
 * @returns Node http/https server instance.
 */
function createServer(): http.Server | https.Server {
  return tlsConfig
    ? https.createServer(tlsConfig, app)
    : http.createServer(app);
}

warnIfUntrustedNetwork();

// Resolve which address to bind to
let bindAddress: string;
try {
  bindAddress = resolveBindAddress(EXPLICIT_HOST, getLanAddresses());
} catch (err) {
  console.error(`Error: ${(err as Error).message}`);
  process.exit(1);
}

const scheme = tlsConfig ? 'https' : 'http';
const server = createServer();
server.listen(PORT, bindAddress, () => {
  const base = `${scheme}://${bindAddress}:${PORT}`;
  console.log(`Listening on ${base}`);
  console.log(`Player URL: ${base}/p/${PLAYER_KEY}`);
  console.log(`Admin URL: ${base}/admin/${ADMIN_KEY}`);
});
