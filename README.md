# LANcade (LAN)

Lightweight LAN-only party game server with a React + TypeScript frontend and Express backend.

No accounts, no data collection, no ads, no analytics. The server runs entirely on your local network, nothing leaves your WiFi. Designed to bring people together in the same room for sociable, fun party gaming.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, TypeScript
- **Shared**: TypeScript types shared between frontend and backend

## Quick Start

1. Install Node.js (v18+ recommended).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build all packages:
   ```bash
   npm run build
   ```
4. Decide HTTP vs HTTPS:
   - HTTP (default): no additional setup needed.
   - HTTPS: create certs in `certs/` and run with `HTTPS_REQUIRED=true`.
5. Start the server:
   ```bash
   npm start
   ```
6. Check the console output for the player and admin invite URLs.
7. Open on your LAN device using the printed invite link:
    - Players: `http(s)://<host-ip>:<port>/p/<player-key>`
    - Admin: `http(s)://<host-ip>:<port>/admin/<admin-key>`

## Development

Run both frontend and backend in development mode with hot reload:
```bash
npm run dev
```

This starts:
- Backend on `http://localhost:<port>` (randomised between 3000–3100 by default)
- Frontend on `http://localhost:5173` (with API proxy to backend)

## Testing

Run all tests (backend and frontend):
```bash
npm test
```

A CI workflow (`.github/workflows/ci.yml`) runs `npm ci` → `npm run build` → `npm test` on every push to `main` and every PR targeting `main`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture, code standards, testing guidelines, project structure, and step-by-step instructions for adding a new game.

## Available Games

| Game ID        | Name             | Description                                       |
|----------------|------------------|---------------------------------------------------|
| `quickfire` | [Category Clash: Quick Fire](https://ltmdum.github.io/LANcade/games/quickfire.html) | One letter, one category, most words wins |
| `multicat` | [Category Clash: Multicat](https://ltmdum.github.io/LANcade/games/multicat.html) | Multiple categories, one shared letter            |
| `lastwordstanding` | [Last Word Standing](https://ltmdum.github.io/LANcade/games/lastwordstanding.html) | Race the clock and survive the votes              |
| `fiveletterword` | [5 Letter Word](https://ltmdum.github.io/LANcade/games/fiveletterword.html)    | Race to guess the 5-letter word                   |
| `mindmatch`   | [Mind Match](https://ltmdum.github.io/LANcade/games/mindmatch.html)       | Match minds with your fellow players              |
| `alphabetrace` | [Alphabet Race](https://ltmdum.github.io/LANcade/games/alphabetrace.html)  | A race through all 26 letters                     |
| `undercoveragent` | [Undercover Agent](https://ltmdum.github.io/LANcade/games/undercoveragent.html) | Find the imposter among you                    |
| `tradingexchange` | [Trading Exchange](https://ltmdum.github.io/LANcade/games/tradingexchange.html) | Trade around the hidden sum of all cards        |
| `ninedash` | [Nine Dash](https://ltmdum.github.io/LANcade/games/ninedash.html) | Build words from a 3x3 grid of jumbled letters          |
| `telepathy` | [Telepathy](https://ltmdum.github.io/LANcade/games/telepathy.html) | Place cards in ascending order without skipping others    |

Each game has a dedicated tutorial page with detailed rules, gameplay explanation, and screenshots.

Games are configured via `games.config.json` in the project root. See [CONTRIBUTING.md](CONTRIBUTING.md) for the config format and instructions on adding or removing games.

## Admin + Player Access

- Each server start generates a random admin key and a random player key, and prints both as invite URLs to the console.
- Visiting `/admin/<admin-key>` grants admin access. Visiting `/p/<player-key>` grants player access. Both are LAN-only.
- Players pick a unique display name when they join.
- The admin panel has a "Play this game" toggle (default on). With it on, the admin joins as a player and participates in the round. With it off, the admin spectates: the round UI is visible (current letter, voting, results) but submit and vote controls are hidden.
- The admin selects which game to run, changes game settings, and ejects players from the admin panel.
- Player identity persists across game switches via localStorage (`playerId`, `playerName`).
- Rate limiting: 10 failed access attempts from the same IP within 60 seconds block that IP for 60 seconds. A failed attempt is a visit to an invalid invite URL (`/p/<wrong>`, `/admin/<wrong>`, or any unknown path) or an API request with a missing or wrong key.

## Custom Categories

Games that use categories (Category Clash: Quick Fire, Category Clash: Multicat, Last Word Standing, Alphabet Race) support admin-added custom categories. In the admin panel, use the "Add" input below the category selector to add a custom category to the list. Custom categories persist for the duration of the server session.

## Configuration

Environment variables:
- `HOST` (optional): bind address. When not set and `LAN_ONLY` is true, the server auto-discovers private network interfaces and binds to each one. Set this explicitly to override (e.g., `HOST=192.168.1.5`).
- `PORT` (default: randomised between 3000–3100 on each startup)
- `LAN_ONLY` (default `true`): set to `false` to allow non-LAN clients.
- `CLIENT_GRACE_MS` (default `5000`): wait time after the timer ends if a client never reports completion.
- `KEY_LENGTH` (default `8`, minimum `6`): length of the generated admin and player access keys (the random part of the invite URLs).
- `HTTPS_REQUIRED` (default `false`): set to `true` to require HTTPS.
- `HTTPS_KEY_PATH` (default `certs/lan-key.pem`): TLS key path.
- `HTTPS_CERT_PATH` (default `certs/lan-cert.pem`): TLS cert path.

## HTTPS Setup (Optional)

To avoid browser warnings, generate a trusted LAN certificate and install the local CA on each device. Using mkcert is the simplest option:

1. Install mkcert and run `mkcert -install`.
2. From this repo, generate a cert for your LAN IP and localhost:
   ```bash
   mkdir -p certs
   mkcert -key-file certs/lan-key.pem -cert-file certs/lan-cert.pem \
     <your-lan-ip> localhost 127.0.0.1
   ```
3. Copy the mkcert root CA to each device and trust it (see mkcert docs).

## Privacy & Feedback

- **Privacy policy**: Published at `https://ltmdum.github.io/LANcade/privacypolicy.html` — covers no data collection, local-only gameplay, Google Play Billing handled by Google.
- **Feedback page**: `docs/feedback.html` — embeds a Google Form (categories: Bug, Feature Request, Suggested Improvement, Other) plus a link to GitHub Issues for users with accounts. Published alongside the privacy policy at `https://ltmdum.github.io/LANcade/feedback.html`.
- **Distribution notice**: `NOTICE.md` clarifies that the MIT license covers server source code only — the mobile app build, branding, and assets may not be redistributed on app stores.

## Security

### LAN-Only Safety

When `LAN_ONLY=true` (the default), the server binds only to private network interfaces discovered at startup. If no private interface is found, startup fails with a clear error. The `isPrivateIp` request-level middleware is kept as defence in depth. If you need to bind to a specific address, set `HOST` explicitly.

### Rate Limiting

The server tracks failed access attempts per IP address — both visits to invalid invite URLs (e.g. `/p/WRONGKEY`, `/admin/WRONGKEY`, or unknown paths) and API requests with missing or wrong keys. After 10 failed attempts from the same IP, that IP is blocked for 60 seconds (HTTP 429 with `Retry-After` header). Failed attempts are logged to the console.

### Connection Limits

SSE (Server-Sent Events) connections are capped at 5 per IP and 50 globally. A heartbeat is sent every 30 seconds to detect and clean up dead connections. Clients exceeding the per-IP limit receive HTTP 429; when the global limit is reached, new connections receive HTTP 503.
