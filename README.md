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
    "categoryclash1",
    "categoryclash2",
    "wordrush"
  ]
}
```

### Available Games

| Game ID        | Name             | Description                                       |
|----------------|------------------|---------------------------------------------------|
| `categoryclash1` | Category Clash v1.0 | Fast rounds, shared letter, and friendly disputes |
| `categoryclash2` | Category Clash v2.0 | Multiple categories, one shared letter            |
| `wordrush`     | WordRush         | Race the clock and survive the votes              |
| `wordsprint` | Word Sprint    | Race to guess the 5-letter word                   |
| `blankslate`   | BlankSlate       | Match minds with your fellow players              |

### Enabling/Disabling Games

To enable or disable games, edit `games.config.json`:

```json
{
  "games": ["categoryclash1", "wordrush"]
}
```

This example enables only Category Clash v1.0 and WordRush, hiding the other games.

### Validation

The configuration is validated at build time. Invalid game IDs or an empty games list will cause the build to fail with a clear error message:

```bash
# Validate config without building
npm run validate-config

# Errors shown during build
Error: Unknown game ID(s) in games.config.json: invalidgame
Available games: categoryclash1, categoryclash2, wordrush, wordsprint
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
|       ├── categoryclash1/
│       │   ├── components/         # Category Clash v1.0 specific components
│       │   ├── hooks/              # Category Clash v1.0 specific hooks
│       │   ├── utils/              # Category Clash v1.0 specific utility functions
│       │   ├── CategoryClash1Game.tsx
│       │   └── plugin.tsx          # Category Clash v1.0 frontend plugin registration
|       ├── categoryclash2/
│       │   ├── components/         # Category Clash v2.0 specific components
│       │   ├── hooks/              # Category Clash v2.0 specific hooks
│       │   ├── utils/              # Category Clash v2.0 specific utility functions
│       │   ├── CategoryClash2Game.tsx
│       │   └── plugin.tsx          # Category Clash v2.0 frontend plugin registration
|       ├── wordRush/
│       │   ├── components/         # WordRush specific components
│       │   ├── hooks/              # WordRush specific hooks
│       │   ├── utils/              # WordRush specific utility functions
│       │   ├── WordRushGame.tsx
│       │   └── plugin.tsx          # WordRush frontend plugin registration
|       ├── wordSprint/
│       │   ├── components/         # Word Sprint specific components
│       │   ├── tests/              # Word Sprint specific tests
│       │   ├── WordSprintGame.tsx
│       │   └── plugin.tsx          # Word Sprint frontend plugin registration
|       ├── blankSlate/
│       │   ├── components/         # BlankSlate specific components
│       │   ├── tests/              # BlankSlate specific tests
│       │   ├── BlankSlateGame.tsx
│       │   └── plugin.tsx          # BlankSlate frontend plugin registration
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
|       ├── categoryclash1/
│       │   ├── stores/         # Category Clash v1.0 specific stores
│       │   ├── utils/          # Category Clash v1.0 specific utility functions
│       │   ├── tests/          # Category Clash v1.0 specific Vitest tests
│       │   ├── categoryclash1.ts
│       │   └── plugin.ts       # Backend plugin registration
|       ├── categoryclash2/
│       │   ├── stores/         # Category Clash v2.0 specific stores
│       │   ├── utils/          # Category Clash v2.0 specific utility functions
│       │   ├── tests/          # Category Clash v2.0 specific Vitest tests
│       │   ├── categoryclash2.ts
│       │   └── plugin.ts
|       ├── wordRush/
│       │   ├── stores/         # WordRush specific stores
│       │   ├── utils/          # WordRush specific utility functions
│       │   ├── tests/          # WordRush specific Vitest tests
│       │   ├── wordrush.ts
│       │   └── plugin.ts
|       ├── wordSprint/
│       │   ├── tests/          # Word Sprint specific Vitest tests
│       │   ├── wordsprint.ts
│       │   ├── scoring.ts      # Guess-style letter evaluation
│       │   ├── word-list.ts    # Word list loading utilities
│       │   ├── guess-words.json  # Bundled Guess word lists
│       │   └── plugin.ts
|       ├── blankSlate/
│       │   ├── tests/          # BlankSlate specific Vitest tests
│       │   ├── blankslate.ts
│       │   ├── prompts.json    # Fill-in-the-blank prompts
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
  'categoryclash1',
  'categoryclash2',
  'wordrush',
  'yourgame',  // Add your game here
]);
```

### 8. Enable Your Game

Add to `games.config.json`:

```json
{
  "games": [
    "categoryclash1",
    "categoryclash2",
    "wordrush",
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

### Category Clash v1.0
- Admin selects a category from a list or uses Random (does not start the game).
- Admin sets a round timer and starts the round.
- Players submit words that start with the round letter. The first player to submit a word wins it; duplicates are rejected (case-insensitive).
- When a player's timer ends, the client notifies the server. The server waits for all players or a short grace period before moving to voting.
- Voting: only players who submitted at least one word can vote. Players downvote other players' words. If at least half of active voters downvote a word, it is voted out.
- Results include a leaderboard (with tie-breaks) and per-player word status (accepted, rejected, voted out) plus vote details.
- The admin can restart during play with a fresh letter (using the current timer).

### Category Clash v2.0
- Admin selects multiple categories (or uses Random to pick a set).
- Players receive a shared letter and can submit one word per category.
- Players can update their submitted words at any time before the timer ends.
- Duplicate words across all categories are rejected, but players can try again.
- Voting and scoring mirror Category Clash v1.0 (only players who submitted words can vote).

### WordRush
- Admin selects a category and time limit.
- The server picks a random starting player and fixes a turn order.
- The current player gets a random letter and must submit a word before the timer expires.
- Duplicate words are rejected and the timer keeps running.
- All other players (including eliminated ones) vote to accept or reject the word. Votes must be submitted within the same time limit as the turn; unsubmitted votes are counted as accepts.
- If more than half reject it, the player gets a final attempt with half the time.
- If the player runs out of time or gets rejected on their final attempt, they are eliminated.
- Play continues until one player remains.
- After a winner is declared, the admin can restart with the same configuration or return to setup.

### Word Sprint
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

### BlankSlate
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

## Configuration

Environment variables:
- `HOST` (default `0.0.0.0`)
- `PORT` (default `3000`)
- `LAN_ONLY` (default `true`): set to `false` to allow non-LAN clients.
- `ADMIN_SESSION_TTL_MS` (default `900000`): admin session expiration.
- `CLIENT_GRACE_MS` (default `5000`): wait time after the timer ends if a client never reports completion.
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

## LAN-Only Safety

The server checks for private IPs and blocks public addresses. Also avoid router port forwarding and use a local firewall if needed.
