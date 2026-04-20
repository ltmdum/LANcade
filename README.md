# LANcade (LAN)

Lightweight LAN-only party game server with a React + TypeScript frontend and Express backend.

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
6. Check the console output for the admin and player passwords.
7. Open on your LAN IP:
   - Players: `http(s)://<host-ip>:3000/`
   - Admin: `http(s)://<host-ip>:3000/admin`

## Development

Run both frontend and backend in development mode with hot reload:
```bash
npm run dev
```

This starts:
- Backend on `http://localhost:3000`
- Frontend on `http://localhost:5173` (with API proxy to backend)

## Testing

Run all tests (backend and frontend):
```bash
npm test
```

## Game Configuration

Games are configured via `games.config.json` in the project root. This file controls which games are available in the application.

### Configuration Format

```json
{
  "games": [
    "quickfire",
    "multicat",
    "lastwordstanding"
  ]
}
```

### Available Games

| Game ID        | Name             | Description                                       |
|----------------|------------------|---------------------------------------------------|
| `quickfire` | Category Clash: Quick Fire | Fast rounds, shared letter, and friendly disputes |
| `multicat` | Category Clash: Multicat | Multiple categories, one shared letter            |
| `lastwordstanding` | Last Word Standing | Race the clock and survive the votes              |
| `fiveletterword` | 5 Letter Word    | Race to guess the 5-letter word                   |
| `mindmatch`   | Mind Match       | Match minds with your fellow players              |
| `alphabetrace` | Alphabet Race  | A race through all 26 letters                     |
| `undercoveragent` | Undercover Agent | Find the imposter among you                    |
| `tradingexchange` | Trading Exchange | Trade around the hidden sum of all cards        |

### Enabling/Disabling Games

To enable or disable games, edit `games.config.json`:

```json
{
  "games": ["quickfire", "lastwordstanding"]
}
```

This example enables only Category Clash: Quick Fire and Last Word Standing, hiding the other games.

### Validation

The configuration is validated at build time. Invalid game IDs or an empty games list will cause the build to fail with a clear error message:

```bash
# Validate config without building
npm run validate-config

# Errors shown during build
Error: Unknown game ID(s) in games.config.json: invalidgame
Available games: quickfire, multicat, lastwordstanding, fiveletterword, mindmatch, alphabetrace, undercoveragent, tradingexchange
```

## Project Structure

```
lancade/
├── games.config.json   # Game configuration (which games are enabled)
├── scripts/
│   └── validate-games-config.js    # Build-time config validation
├── frontend/           # React + Vite + TailwindCSS
│   └── src/
|       ├── shared/
│       │   ├── components/         # Shared UI components (each with .tsx and .css)
│       │   ├── hooks/              # Shared React hooks (useServerState, useGameUtils)
│       │   ├── tests/              # Shared tests
│       │   │   └── utils/          # Shared utility tests
│       │   ├── types/              # Shared TypeScript types (GameProps)
│       │   └── utils/              # Shared utilities (wordSubmission, voting, roundActions)
|       ├── categoryclashshared/
│       │   ├── components/         # Components shared by Category Clash games
│       │   ├── hooks/              # Hooks shared by Category Clash games
│       │   ├── tests/              # Category Clash shared tests
│       │   │   └── utils/          # Category Clash shared utility tests
│       │   └── utils/              # Utility functions shared by Category Clash games
|       ├── quickFire/
│       │   ├── components/         # Quick Fire specific components
│       │   ├── hooks/              # Quick Fire specific hooks
│       │   ├── utils/              # Quick Fire specific utility functions
│       │   ├── QuickFireGame.tsx
│       │   └── plugin.tsx          # Quick Fire frontend plugin registration
|       ├── multicat/
│       │   ├── components/         # Multicat specific components
│       │   ├── hooks/              # Multicat specific hooks
│       │   ├── utils/              # Multicat specific utility functions
│       │   ├── MulticatGame.tsx
│       │   └── plugin.tsx          # Multicat frontend plugin registration
|       ├── lastWordStanding/
│       │   ├── components/         # Last Word Standing specific components
│       │   ├── hooks/              # Last Word Standing specific hooks
│       │   ├── utils/              # Last Word Standing specific utility functions
│       │   ├── LastWordStandingGame.tsx
│       │   └── plugin.tsx          # Last Word Standing frontend plugin registration
|       ├── fiveLetterWord/
│       │   ├── components/         # 5 Letter Word specific components
│       │   ├── tests/              # 5 Letter Word specific tests
│       │   ├── FiveLetterWordGame.tsx
│       │   └── plugin.tsx          # 5 Letter Word frontend plugin registration
|       ├── mindMatch/
│       │   ├── components/         # Mind Match specific components
│       │   ├── tests/              # Mind Match specific tests
│       │   ├── MindMatchGame.tsx
│       │   └── plugin.tsx          # Mind Match frontend plugin registration
|       ├── alphabetRace/
│       │   ├── components/         # Alphabet Race specific components
│       │   ├── tests/              # Alphabet Race specific tests
│       │   ├── AlphabetRaceGame.tsx
│       │   └── plugin.tsx          # Alphabet Race frontend plugin registration
|       ├── undercoverAgent/
│       │   ├── components/         # Undercover Agent specific components
│       │   ├── tests/              # Undercover Agent specific tests
│       │   ├── UndercoverAgentGame.tsx
│       │   └── plugin.tsx          # Undercover Agent frontend plugin registration
|       ├── tradingExchange/
│       │   ├── components/         # Trading Exchange specific components
│       │   ├── tests/              # Trading Exchange specific tests
│       │   ├── utils/              # Trading Exchange specific utility functions
│       │   ├── TradingExchangeGame.tsx
│       │   └── plugin.tsx          # Trading Exchange frontend plugin registration
│       └── plugins/            # Frontend plugin system
├── backend/            # Express + TypeScript
│   └── src/
|       ├── shared/
│       │   ├── stores/         # Shared state management
│       │   ├── utils/          # Shared utility functions
│       │   └── tests/          # Shared Vitest tests
|       ├── categoryclashshared/
│       │   ├── stores/         # CategoryClash-specific stores
│       │   ├── utils/          # CategoryClash-specific utility functions
│       │   ├── tests/          # CategoryClash-specific Vitest tests
│       │   └── categoryclash-engine.ts
|       ├── quickFire/
│       │   ├── stores/         # Quick Fire specific stores
│       │   ├── utils/          # Quick Fire specific utility functions
│       │   ├── tests/          # Quick Fire specific Vitest tests
│       │   ├── quickfire.ts
│       │   └── plugin.ts       # Backend plugin registration
|       ├── multicat/
│       │   ├── stores/         # Multicat specific stores
│       │   ├── utils/          # Multicat specific utility functions
│       │   ├── tests/          # Multicat specific Vitest tests
│       │   ├── multicat.ts
│       │   └── plugin.ts
|       ├── lastWordStanding/
│       │   ├── stores/         # Last Word Standing specific stores
│       │   ├── utils/          # Last Word Standing specific utility functions
│       │   ├── tests/          # Last Word Standing specific Vitest tests
│       │   ├── lastwordstanding.ts
│       │   └── plugin.ts
|       ├── fiveLetterWord/
│       │   ├── tests/          # 5 Letter Word specific Vitest tests
│       │   ├── fiveletterword.ts
│       │   ├── scoring.ts      # Guess-style letter evaluation
│       │   ├── word-list.ts    # Word list loading utilities
│       │   ├── guess-words.json  # Bundled Guess word lists
│       │   └── plugin.ts
|       ├── mindMatch/
│       │   ├── tests/          # Mind Match specific Vitest tests
│       │   ├── mindmatch.ts
│       │   ├── prompts.json    # Fill-in-the-blank prompts
│       │   └── plugin.ts
|       ├── alphabetRace/
│       │   ├── tests/          # Alphabet Race specific Vitest tests
│       │   ├── alphabetrace.ts
│       │   └── plugin.ts
|       ├── undercoverAgent/
│       │   ├── tests/          # Undercover Agent specific Vitest tests
│       │   ├── undercoveragent.ts
│       │   └── plugin.ts
|       ├── tradingExchange/
│       │   ├── tests/          # Trading Exchange specific Vitest tests
│       │   ├── tradingexchange.ts
│       │   ├── matching.ts     # Order matching algorithms
│       │   └── plugin.ts
│       └── plugins/        # Backend plugin system
│           └── tests/          # Vitest tests (mirrors src structure)
├── shared/         # Shared types between frontend and backend
└── package.json    # Root workspace configuration
```

## Adding a New Game

To add a new game to the system:

### 1. Create the Backend Game Engine

Create your game in `backend/src/games/yourgame/`:

```typescript
// backend/src/games/yourgame/yourgame.ts
export interface YourGameOptions {
  onStateChange?: () => void;
  playerStore?: PlayerStore;
}

export function createGame(options: YourGameOptions) {
  // Implement game logic
  return {
    getState: () => ({ /* game state */ }),
    getPhase: () => 'idle',
    joinPlayer: (payload) => ({ ok: true, playerId: '...', name: '...' }),
    submitWord: (playerId, word) => ({ ok: true }),
    submitVotes: (playerId, votes) => ({ ok: true }),
    startRound: (durationMs) => ({ ok: true }),
    // Add optional methods as needed:
    // selectCategory, selectRandomCategory, selectCategories, etc.
  };
}
```

### 2. Create the Backend Plugin

```typescript
// backend/src/games/yourgame/plugin.ts
import type { GamePlugin, GameFactoryOptions, BaseGame } from '../../plugins/types.js';
import { createGame } from './yourgame.js';

function factory(options: GameFactoryOptions): BaseGame {
  return createGame({
    onStateChange: options.onStateChange,
    playerStore: options.playerStore,
  });
}

export const plugin: GamePlugin = {
  definition: {
    id: 'yourgame',
    name: 'Your Game Name',
    factory,
  },
};
```

### 3. Register the Backend Plugin

Add to `backend/src/plugins/games.ts`:

```typescript
import { plugin as yourgamePlugin } from '../games/yourgame/plugin.js';

// In the registration section:
gameRegistry.register(yourgamePlugin);
```

### 4. Create the Frontend Game Component

Create your game UI in `frontend/src/games/yourgame/`:

```tsx
// frontend/src/games/yourgame/YourGame.tsx
export function YourGame({ serverState, playerId, ... }) {
  // Implement game UI
  return <div>...</div>;
}
```

### 5. Create the Frontend Plugin

```tsx
// frontend/src/games/yourgame/plugin.tsx
import type { GamePlugin, GameComponentProps } from '../../plugins/types';
import { YourGame } from './YourGame';

export const plugin: GamePlugin = {
  config: {
    id: 'yourgame',
    name: 'Your Game Name',
    description: 'A brief description of your game.',
    defaultTimer: { minutes: '01', seconds: '00' },
    roundControlTitle: 'Round Control',
    joinPanelTitle: 'Join the Game',
  },
  canRender: (serverState, gameId) => {
    return gameId === 'yourgame' && /* check state shape */;
  },
  render: (props) => <YourGame {...props} />,
};
```

### 6. Register the Frontend Plugin

Add to `frontend/src/plugins/games.ts`:

```typescript
import { plugin as yourgamePlugin } from '../games/yourgame/plugin';

// In the registration section:
gamePluginRegistry.register(yourgamePlugin);
```

### 7. Update the Validation Script

Add your game ID to `scripts/validate-games-config.js`:

```javascript
const KNOWN_GAMES = new Set([
  'quickfire',
  'multicat',
  'lastwordstanding',
  'yourgame',  // Add your game here
]);
```

### 8. Enable Your Game

Add to `games.config.json`:

```json
{
  "games": [
    "quickfire",
    "multicat",
    "lastwordstanding",
    "yourgame"
  ]
}
```

### 9. Add Tests

Create tests in `backend/src/tests/yourgame/` to test your game logic.

## Admin + Player Access

- Admin access is claimed with the admin password. Only one admin session is active at a time.
- Player actions require the player password. Names must be unique.
- Both passwords are randomly generated on each server start and printed to the console.
- The admin can select which game to run from the configuration page.
- The admin can eject players from the server on the configuration screen.
- Players stay registered across game switches (local storage preserves their player ID).

## Games

### Category Clash: Quick Fire
- Admin selects a category from a list or uses Random (does not start the game).
- Admin sets a round timer and starts the round.
- Players submit words that start with the round letter. The first player to submit a word wins it; duplicates are rejected (case-insensitive).
- When a player's timer ends, the client notifies the server. The server waits for all players or a short grace period before moving to voting.
- Voting: only players who submitted at least one word can vote. Players downvote other players' words. If at least half of active voters downvote a word, it is voted out.
- Results include a leaderboard (with tie-breaks) and per-player word status (accepted, rejected, voted out) plus vote details.
- The admin can restart during play with a fresh letter (using the current timer).

### Category Clash: Multicat
- Admin selects multiple categories (or uses Random to pick a set).
- Players receive a shared letter and can submit one word per category.
- Players can update their submitted words at any time before the timer ends.
- Duplicate words across all categories are rejected, but players can try again.
- Voting and scoring mirror Quick Fire (only players who submitted words can vote).

### Last Word Standing
- Admin selects a category and time limit.
- The server picks a random starting player and fixes a turn order.
- The current player gets a random letter and must submit a word before the timer expires.
- Duplicate words are rejected and the timer keeps running.
- All other players (including eliminated ones) vote to accept or reject the word. Votes must be submitted within the same time limit as the turn; unsubmitted votes are counted as accepts.
- If more than half reject it, the player gets a final attempt with half the time.
- If the player runs out of time or gets rejected on their final attempt, they are eliminated.
- Play continues until one player remains.
- After a winner is declared, the admin can restart with the same configuration or return to setup.

### 5 Letter Word
- A competitive Guess-style racing game using the official Guess word lists (bundled from guess-wordlist).
- All players solve the same word simultaneously, racing to be first.
- Players have 6 attempts to guess a 5-letter word.
- Green = correct letter in correct position, yellow = correct letter in wrong position.
- **Single player mode**: Works like regular Guess.
- **Multiplayer mode**: Race to solve first!
  - Each player has their own independent grid.
  - All players can submit guesses at any time.
  - A mini display next to each row shows the best result across all players for that row (5 small colored squares indicating the best green/yellow combination anyone has found).
  - The first player to guess the word correctly wins.
- If no one guesses in 6 tries, no winner is declared.
- No timer needed—it's a pure race!

### Mind Match
- A fill-in-the-blank party game where players try to match answers.
- Requires at least 3 players to start.
- Each round shows a prompt with a blank (e.g., "_____ body" or "house _____").
- All players secretly submit a word to complete the phrase.
- **Scoring**:
  - If exactly 2 players submit the same word, they each get 3 points.
  - If 3+ players submit the same word, they each get 1 point.
  - Unique answers get 0 points.
- **Claiming**: Players with unique words can claim their answer was the same as another group. All other players vote to accept or reject the claim (majority wins).
- If accepted, the claimant joins that group and receives points accordingly.
- First player to reach 25 points wins the game.

### Alphabet Race
- A race through all 26 letters of the alphabet!
- Admin selects a single category before starting.
- The game starts at a random letter and cycles through all 26 (in order).
- **Racing Phase**: All players race to be the first to submit a valid word for the current letter.
- **Voting Phase**: Once a word is submitted, all other eligible players have a configurable timeout (default 10s) to accept or reject it.
- If ≥50% of eligible voters reject the word:
  - The submitter is ineligible for the rest of this letter AND the next letter (penalty).
  - Other players can now race to submit for this letter.
- If the word is accepted (or no majority rejects):
  - The submitter scores 1 point.
  - Play advances to the next letter.
- If all but one player become ineligible for a letter, all penalties are wiped and all players are eligible again.
- Play continues until all 26 letters are completed.
- The player with the most accepted words wins!
- Admins can add custom categories to the selectable list.

### Undercover Agent
- A social deduction game where one player is secretly the undercover agent.
- Requires at least 3 players to start.
- All players are shown the same word, except the undercover agent who is told they are undercover.
- **Reveal Phase**: Players click "Reveal" to learn their role, then click "Ready" to proceed.
- **Submission Rounds**: Starting at a random player, each player submits one word associated with the shared word. The undercover agent must fake it! Previously submitted words are rejected. The number of submission rounds is configurable.
  - If any player submits the secret word, the game ends immediately and the agent wins. If a civilian submits it, it's an automatic loss for the civilians!
  - Civilians should be careful not to give away the word with their clues!
- **Voting Rounds**: Players see all submitted words and vote for who they think is the undercover agent.
  - A unanimous vote (all players except the target vote for that player) resolves the round.
  - If the unanimous vote targets the wrong player, the undercover agent wins immediately.
  - If the unanimous vote correctly identifies the undercover agent, the agent gets one final chance to guess the secret word. If they guess correctly, the agent still wins. If they guess wrong, the civilians win.
  - A non-unanimous vote triggers another voting round with the tally visible.
  - There is no limit on the number of voting rounds.

### Trading Exchange
- A card-based trading game where players estimate the hidden sum of all dealt cards.
- Admin configures the number of cards per player and the inactivity timeout.
- **Auction Phase**: Players are dealt cards and submit blind bid/offer pairs.
  - Crossed orders are matched off (highest bid with lowest offer, at the midpoint price).
  - Remaining unmatched orders form the initial orderbook.
- **Continuous Trading**: Players adjust bid/offer pairs in real-time.
  - Orders match at the passive (existing) order's price.
  - An inactivity timer resets on every trade; when it expires, the round ends.
  - At the start of each new round, one card per player is revealed to everyone.
  - The number of trading rounds equals the number of cards per player, plus one.
  - In the final round, all cards are revealed — fastest traders get the best prices.
- **Settlement**: Outstanding positions are settled at the true value (sum of all cards).
- **Scoring**: Highest total P&L (realized + settlement) wins.
- Card-related utilities are shared in `shared/src/cards.ts`, `backend/src/shared/cards/`, and `frontend/src/shared/cards/` for reuse by future card games.

## Custom Categories

Games that use categories (Category Clash: Quick Fire, Category Clash: Multicat, Last Word Standing, Alphabet Race) support admin-added custom categories. In the admin panel, use the "Add" input below the category selector to add a custom category to the list. Custom categories persist for the duration of the game session.

## Configuration

Environment variables:
- `HOST` (optional): bind address. When not set and `LAN_ONLY` is true, the server auto-discovers private network interfaces and binds to each one. Set this explicitly to override (e.g., `HOST=192.168.1.5`).
- `PORT` (default `3000`)
- `LAN_ONLY` (default `true`): set to `false` to allow non-LAN clients.
- `ADMIN_SESSION_TTL_MS` (default `900000`): admin session expiration.
- `CLIENT_GRACE_MS` (default `5000`): wait time after the timer ends if a client never reports completion.
- `PASSWORD_LENGTH` (default `8`, minimum `6`): length of the generated admin and player passwords.
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

## Security

### LAN-Only Safety

When `LAN_ONLY=true` (the default), the server binds only to private network interfaces discovered at startup. If no private interface is found, startup fails with a clear error. The `isPrivateIp` request-level middleware is kept as defence in depth. If you need to bind to a specific address, set `HOST` explicitly.

### Rate Limiting

All password-authenticated routes are rate limited per IP address. After 10 failed authentication attempts from the same IP, that IP is blocked for 60 seconds (HTTP 429 with `Retry-After` header). Failed attempts are logged to the console.

### Connection Limits

SSE (Server-Sent Events) connections are capped at 5 per IP and 50 globally. A heartbeat is sent every 30 seconds to detect and clean up dead connections. Clients exceeding the per-IP limit receive HTTP 429; when the global limit is reached, new connections receive HTTP 503.
