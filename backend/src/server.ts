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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize games from config (will throw on invalid config)
initializeGames();

const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '3000', 10);
const LAN_ONLY = process.env.LAN_ONLY !== 'false';
const ADMIN_SESSION_TTL_MS = parseInt(process.env.ADMIN_SESSION_TTL_MS || '900000', 10);
const HTTPS_REQUIRED = process.env.HTTPS_REQUIRED === 'true';
const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH || path.join(__dirname, '..', '..', 'certs', 'lan-key.pem');
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH || path.join(__dirname, '..', '..', 'certs', 'lan-cert.pem');
const CLIENT_GRACE_MS = parseInt(process.env.CLIENT_GRACE_MS || '5000', 10);

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a random admin/player password.
 * @param length Length of the password to generate.
 * @returns Random password string.
 */
function randomPassword(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
  }
  return value;
}

const ADMIN_PASSWORD = randomPassword(6);
const PLAYER_PASSWORD = randomPassword(6);

let selectedGameId = gameRegistry.getDefaultGameId() || '';
let gameInstance: BaseGame | null = null;
let adminSession: { id: string; lastSeen: number } | null = null;
const sseClients = new Set<Response>();
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
 * Get all LAN IPv4 addresses for this host.
 * @returns Array of LAN IP addresses.
 */
function getLanAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const ifaceEntries of Object.values(interfaces)) {
    for (const entry of ifaceEntries || []) {
      if (entry.family !== 'IPv4' || entry.internal) {
        continue;
      }
      if (isPrivateIp(entry.address)) {
        addresses.push(entry.address);
      }
    }
  }
  return Array.from(new Set(addresses));
}

/**
 * Check if the admin session is active and refresh last seen.
 * @returns True when the session is active.
 */
function isAdminSessionActive(): boolean {
  if (!adminSession) {
    return false;
  }
  if (Date.now() - adminSession.lastSeen > ADMIN_SESSION_TTL_MS) {
    adminSession = null;
    return false;
  }
  return true;
}

/**
 * Validate a request as admin based on bearer token.
 * @param req Express request.
 * @returns True if admin token is valid.
 */
function requireAdmin(req: Request): boolean {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    return false;
  }
  if (!isAdminSessionActive()) {
    return false;
  }
  if (match[1] !== adminSession!.id) {
    return false;
  }
  adminSession!.lastSeen = Date.now();
  return true;
}

/**
 * Validate the player password from a request payload.
 * @param pass Raw password value.
 * @returns True if the password matches.
 */
function verifyPlayerPassword(pass: unknown): boolean {
  return pass === PLAYER_PASSWORD;
}

/**
 * Validate an admin session id from a request payload.
 * @param sessionId Raw session id value.
 * @returns True if the session id matches and is active.
 */
function adminSessionMatches(sessionId: unknown): boolean {
  return isAdminSessionActive() && adminSession !== null && adminSession.id === sessionId;
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
    client.write(`event: state\ndata: ${payload}\n\n`);
  }
}

// Create Express app
const app = express();
app.use(express.json());

// LAN-only middleware
if (LAN_ONLY) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!isPrivateIp(req.socket.remoteAddress)) {
      res.status(403).send('LAN access only');
      return;
    }
    next();
  });
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

// API routes
app.get('/api/state', (req: Request, res: Response) => {
  const passwordOk = verifyPlayerPassword(req.query.password);
  const adminOk = adminSessionMatches(req.query.adminSessionId);
  if (!passwordOk && !adminOk) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  res.json(buildPublicState());
});

app.get('/api/games', (req: Request, res: Response) => {
  const passwordOk = verifyPlayerPassword(req.query.password);
  const adminOk = adminSessionMatches(req.query.adminSessionId);
  if (!passwordOk && !adminOk) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  res.json({
    selectedGameId,
    games: gameRegistry.listEnabledGames(),
  });
});

app.get('/api/events', (req: Request, res: Response) => {
  const passwordOk = verifyPlayerPassword(req.query.password);
  const adminOk = adminSessionMatches(req.query.adminSessionId);
  if (!passwordOk && !adminOk) {
    res.status(401).send('Unauthorized');
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.write('\n');

  sseClients.add(res);
  const payload = JSON.stringify(buildPublicState());
  res.write(`event: state\ndata: ${payload}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

app.post('/api/players/join', (req: Request, res: Response) => {
  const payload = req.body;
  if (!verifyPlayerPassword(payload.password)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const result = gameInstance!.joinPlayer({
    name: payload.name,
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
  const payload = req.body;
  if (!verifyPlayerPassword(payload.password)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const result = gameInstance!.submitWord(
    payload.playerId,
    payload.word || '',
    payload.category
  );
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  res.json({ ok: true, accepted: true });
});

app.post('/api/round/finish', (req: Request, res: Response) => {
  const payload = req.body;
  if (!verifyPlayerPassword(payload.password)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const roundId = parseInt(payload.roundId, 10);
  if (!Number.isFinite(roundId)) {
    res.status(400).json({ error: 'invalid_round' });
    return;
  }

  if (typeof gameInstance!.finishRound !== 'function') {
    res.status(400).json({ error: 'not_supported' });
    return;
  }

  const result = gameInstance!.finishRound(payload.playerId, roundId);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  res.json({ ok: true });
});

app.post('/api/round/votes', (req: Request, res: Response) => {
  const payload = req.body;
  if (!verifyPlayerPassword(payload.password)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  let votePayload: unknown = payload;
  if (Object.prototype.hasOwnProperty.call(payload, 'downvotedWordIds')) {
    votePayload = payload.downvotedWordIds;
  } else if (Object.prototype.hasOwnProperty.call(payload, 'votes')) {
    votePayload = payload.votes;
  }
  const result = gameInstance!.submitVotes(payload.playerId, votePayload);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  res.json({ ok: true });
});

app.post('/api/admin/claim', (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || payload.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: 'invalid_password' });
    return;
  }

  if (isAdminSessionActive()) {
    res.status(409).json({
      error: 'admin_active',
      expiresAt: adminSession!.lastSeen + ADMIN_SESSION_TTL_MS,
    });
    return;
  }

  adminSession = {
    id: crypto.randomBytes(16).toString('hex'),
    lastSeen: Date.now(),
  };

  res.json({
    sessionId: adminSession.id,
    expiresAt: adminSession.lastSeen + ADMIN_SESSION_TTL_MS,
  });
});

app.get('/api/admin/status', (req: Request, res: Response) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  res.json({
    active: true,
    expiresAt: adminSession!.lastSeen + ADMIN_SESSION_TTL_MS,
  });
});

app.post('/api/admin/start', (req: Request, res: Response) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const payload = req.body;
  const durationMs = parseInt(payload.durationMs, 10);
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    res.status(400).json({ error: 'invalid_duration' });
    return;
  }

  const result = gameInstance!.startRound(durationMs);
  res.json(result);
});

app.post('/api/admin/category', (req: Request, res: Response) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const payload = req.body;
  let result: { ok: boolean; reason?: string };
  
  if (payload && Array.isArray(payload.categories)) {
    if (typeof gameInstance!.selectCategories !== 'function') {
      res.status(400).json({ error: 'invalid_request' });
      return;
    }
    result = gameInstance!.selectCategories(payload.categories);
  } else if (payload && payload.random && typeof gameInstance!.selectRandomCategories === 'function') {
    result = gameInstance!.selectRandomCategories(payload.count);
  } else if (payload && payload.random && typeof gameInstance!.selectRandomCategory === 'function') {
    result = gameInstance!.selectRandomCategory();
  } else if (typeof gameInstance!.selectCategory === 'function') {
    result = gameInstance!.selectCategory(payload.category);
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
  if (!requireAdmin(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

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
  if (!requireAdmin(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

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
  if (!requireAdmin(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  if (typeof gameInstance!.endGame !== 'function') {
    res.status(400).json({ error: 'not_supported' });
    return;
  }

  const result = gameInstance!.endGame();
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
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Create server
const tlsConfig = HTTPS_REQUIRED ? loadTlsConfig() : null;
if (HTTPS_REQUIRED && !tlsConfig) {
  console.error('HTTPS is required but certificate files were not found.');
  console.error(`Expected key: ${HTTPS_KEY_PATH}`);
  console.error(`Expected cert: ${HTTPS_CERT_PATH}`);
  console.error('Generate a trusted LAN cert before starting the server.');
  process.exit(1);
}

const server = tlsConfig
  ? https.createServer(tlsConfig, app)
  : http.createServer(app);

server.listen(PORT, HOST, () => {
  const scheme = tlsConfig ? 'https' : 'http';
  console.log(`Server running on ${scheme}://${HOST}:${PORT}`);
  const lanAddresses = getLanAddresses();
  if (lanAddresses.length > 0) {
    const primary = lanAddresses[0];
    console.log(`LAN address: ${primary}`);
    console.log(`Players: ${scheme}://${primary}:${PORT}/`);
    console.log(`Admin: ${scheme}://${primary}:${PORT}/admin`);
    if (lanAddresses.length > 1) {
      console.log(`Other LAN addresses: ${lanAddresses.slice(1).join(', ')}`);
    }
  } else {
    console.log('LAN address: unavailable');
  }
  console.log(`Admin password: ${ADMIN_PASSWORD}`);
  console.log(`Player password: ${PLAYER_PASSWORD}`);
});
