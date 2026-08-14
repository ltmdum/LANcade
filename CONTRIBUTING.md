# Contributing to LANcade

## Getting Started

- Use `npm install` (yarn is not used in this project).
- Start the dev server with `npm run dev` — this runs both the backend (`localhost:<port>`) and frontend (`localhost:5173`) with hot reload. The backend port is randomised between 3000–3100; check the console output for the URL.
- Build all packages with `npm run build`.
- Run tests with `npm test`.

## Architecture

LANcade uses an extensible plugin system:

- **Backend plugins** (`backend/src/*/plugin.ts`) register game logic with the server. Each game is a self-contained module with no dependencies on other games.
- **Frontend plugins** (`frontend/src/*/plugin.tsx`) register game UIs with the player-facing app. Each game UI is a self-contained component.
- The server (`backend/src/server.ts`) and the frontend shell (`frontend/src/App.tsx`) must never import or reference any game-specific code. Games are discovered and loaded purely through the plugin registry.

**Key rule:** All games must be completely independent of each other. If multiple games need the same utility, extract it to a shared location (`frontend/src/shared/`, `backend/src/shared/`, or the shared workspace) rather than duplicating it across games.

## Project Structure

```
lancade/
├── games.config.json           # Enabled games with display names
├── .github/workflows/ci.yml    # Build + test on push/PR to main
├── scripts/
│   └── validate-games-config.js
├── frontend/                   # React + Vite + TailwindCSS
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
|       ├── ninedash/
│       │   ├── components/         # Nine Dash specific components (LetterGrid, active panel)
│       │   ├── tests/              # Nine Dash specific tests
│       │   ├── NineDashGame.tsx
│       │   └── plugin.tsx          # Nine Dash frontend plugin registration
│       └── plugins/            # Frontend plugin system
├── backend/            # Express + TypeScript
│   └── src/
|       ├── shared/
│       │   ├── stores/         # Shared state management
│       │   ├── utils/          # Shared utility functions
│       │   ├── data/           # Word list JSON files
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
│       │   ├── word-list.ts    # Word list loading utilities (full dict for guesses, curated for answers)
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
|       ├── ninedash/
│       │   ├── tests/          # Nine Dash specific Vitest tests
│       │   ├── grid.ts         # Grid generation and letter jumbling
│       │   ├── word-source.ts  # Loads curated nine-letter seed words
│       │   ├── ninedash.ts
│       │   └── plugin.ts
│       └── plugins/        # Backend plugin system
│           └── tests/          # Vitest tests (mirrors src structure)
├── shared/         # Shared types between frontend and backend
└── package.json    # Root workspace configuration
```

## Game Configuration

Games are enabled via `games.config.json` in the project root:

```json
{
  "games": [
    { "id": "telepathy", "displayName": "Telepathy" },
    { "id": "lastwordstanding", "displayName": "Last Word Standing" }
  ]
}
```

Each entry has an `id` (matching the game plugin ID) and a `displayName` (shown in app UI). The config is validated at build time — invalid IDs or an empty list will fail the build.

## Adding a New Game

### 1. Create the Backend Game Engine

Create your game in `backend/src/yourgame/`:

```typescript
// backend/src/yourgame/yourgame.ts
import { PlayerStore } from '../shared/stores/player-store.js';
import { SessionStore } from '../shared/stores/session-store.js';

export interface YourGameOptions {
  onStateChange?: () => void;
  playerStore?: PlayerStore;
  sessionStore?: SessionStore;
}

export function createGame(options: YourGameOptions) {
  return {
    getState: () => ({ /* game state */ }),
    getPhase: () => 'idle',
    joinPlayer: (payload) => ({ ok: true, playerId: '...', name: '...' }),
    submitWord: (playerId, word) => ({ ok: true }),
    submitVotes: (playerId, votes) => ({ ok: true }),
    startRound: (durationMs) => ({ ok: true }),
    updateSettings: (settings) => ({ ok: true }),
    getOlympicsResult: () => null,
  };
}
```

The game engine must implement `BaseGame` methods. Optional interfaces include:
- `selectCategory(category)`, `addCategory(category)`, `selectRandomCategory()` — for category-based games
- `updateSettings(settings)` — for games with admin-configurable options
- `getOlympicsResult()` — for session olympics support
- `dispose()` — for games with timers that need cleanup

### 2. Create the Backend Plugin

```typescript
// backend/src/yourgame/plugin.ts
import type { GamePlugin, GameFactoryOptions, BaseGame } from '../../plugins/types.js';
import { createGame } from './yourgame.js';

function factory(options: GameFactoryOptions): BaseGame {
  return createGame({
    onStateChange: options.onStateChange,
    playerStore: options.playerStore,
    sessionStore: options.sessionStore,
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

If your game supports categories (selecting / adding categories) you must also forward those methods from the game instance to the server route handler. See existing category-based plugins for the pattern used in the factory function. Categories are managed via the `/api/admin/category` route in `server.ts` which calls `selectCategory`, `selectRandomCategory`, and `addCategory` on the active game.

### 3. Register the Backend Plugin

Add to `backend/src/plugins/games.ts`:

```typescript
import { plugin as yourgamePlugin } from '../yourgame/plugin.js';

// In the registration section:
gameRegistry.register(yourgamePlugin);
```

### 4. Create the Frontend Game Component

Create your game UI in `frontend/src/yourgame/`:

```tsx
// frontend/src/yourgame/YourGame.tsx
export function YourGame({ serverState, playerId, ... }) {
  return <div>...</div>;
}
```

### 5. Create the Frontend Plugin

```tsx
// frontend/src/yourgame/plugin.tsx
import type { GamePlugin, GameComponentProps } from '../../plugins/types';
import { YourGame } from './YourGame';

export const plugin: GamePlugin = {
  config: {
    id: 'yourgame',
    name: 'Your Game Name',
    slogan: 'A short tagline for your game.',
    description: 'A brief description of your game.',
    instructions: [
      { heading: "Step 1", text: "Description of the first step." },
      { heading: "Step 2", text: "Description of the second step." },
    ],
    defaultTimer: { minutes: '01', seconds: '00' },
    roundControlTitle: 'Round Control',
    joinPanelTitle: 'Join the Game',
    olympics: true,
    sharesWordPool: false,
    gameSettings: [
      { key: 'rounds', label: 'Number of Rounds', type: 'select', options: [...], defaultValue: 3 },
    ],
  },
  canRender: (serverState, gameId) => {
    return gameId === 'yourgame' && /* check state shape */;
  },
  getPhase: (serverState) => /* extract phase from state */,
  render: (props) => <YourGame {...props} />,
};
```

The `config` object supports these optional fields:
- `olympics` (`boolean`) — set `true` for games that participate in the session-wide medal tally
- `sharesWordPool` (`boolean`) — set `true` if the game contributes to / reads from the shared word pool
- `gameSettings` — declarative admin controls rendered as a settings panel; handled on the backend via `updateSettings()`
- `minPlayers` — minimum players required to start (defaults to 1)
- `hideTimer` — hide the timer config in the admin panel
- `customDuration` — custom duration selector replacing minutes/seconds dropdowns

### 6. Register the Frontend Plugin

Add to `frontend/src/plugins/games.ts`:

```typescript
import { plugin as yourgamePlugin } from '../yourgame/plugin';

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
    { "id": "telepathy", "displayName": "Telepathy" },
    { "id": "quickfire", "displayName": "Category Clash: Quick Fire" },
    { "id": "multicat", "displayName": "Category Clash: Multicat" },
    { "id": "lastwordstanding", "displayName": "Last Word Standing" },
    { "id": "yourgame", "displayName": "Your Game Name" }
  ]
}
```

### 9. Add Tests

Create tests for your game logic in `backend/src/tests/yourgame/`. If your game has a frontend component, add frontend tests too.

### 10. Create a Tutorial Page

Every game must ship with an HTML tutorial page at `docs/games/<gameid>.html`. This page is linked from the in-app "How to Play" modal and serves as the primary reference for players.

The page should follow the same structure as existing game pages:

- **Title and slogan** at the top
- **Player count** recommendation
- **Tutorial section** with gameplay screenshots in horizontally scrollable rows, each with a caption explaining what the player sees
- **Rules section** summarising the game rules in a bulleted list

Use the existing pages (e.g. `docs/games/quickfire.html`) as a template. Screenshots go in `docs/games/screenshots/<gameid>/`.

## Olympics Medal System

Games can participate in a session-wide medal tally by implementing the olympics contract.

### Backend Contract

Implement `getOlympicsResult()` on the game engine. It must return `{ podium: string[][], playerCount: number } | null`:

- `podium` — array of up to 3 groups: `[[1st place names], [2nd place names], [3rd place names]]`. Tied players share a group.
- `playerCount` — total number of players who participated (including those with 0 score).
- Return `null` if the game has not finished or does not support olympics.

Use `buildPodiumFromScores(scores)` from `shared/src/olympics.ts` to build a podium from a `Record<string, number>` of player scores. This function includes all players regardless of score (no score filtering).

### Tie Rules

Medals follow standard Olympic tie rules:
- 2+ tied for 1st → skip silver, bronze goes to the 3rd-place group (if any)
- 3+ tied for 1st → skip silver and bronze
- 2+ tied for 2nd → skip bronze
- Single group → only gold

Use `awardMedals(podium, playerCount)` from `shared/src/olympics.ts` to apply these rules and get the medal groups.

### Medal Emoji Placement

Display the medal emoji **before** the player name: `🥇 Alice`. Use `medalEmojiForPodium(podium, playerCount, playerName)` — a 3-argument function that internally calls `awardMedals` and returns the emoji for the given player name, or an empty string if the player did not medal.

### Medal Tally

The `OlympicsMedals` component in `frontend/src/shared/components/OlympicsMedals.tsx` displays the session-wide medal tally. It is rendered in `App.tsx`:
- During idle phase: above the game view
- During results/finished: below the game view

The tally is wrapped in a `<Panel title="Medal Tally">` and shows all session players.

### Frontend Config

Set `olympics: true` on the frontend game plugin config to signal that the game participates in the medal system. Telepathy is the only game currently opted out.

### Utilities

All olympics utilities live in `shared/src/olympics.ts` and are re-exported from `shared/src/index.ts`:

| Function | Description |
|---|---|
| `buildPodiumFromScores(scores)` | Build podium from score map (no score filter) |
| `awardMedals(podium, playerCount)` | Assign medals with Olympic tie rules |
| `medalEmojiForPodium(podium, playerCount, playerName)` | Get emoji string for a player (3-arg) |
| `mergeMedalTallies(tallies)` | Merge multiple tallies into one |

## Cross-Game Shared Word Pool

Games can opt into a shared word pool that prevents the same word from being used across different game types in the same session.

### Frontend Config

Set `sharesWordPool: true` on the frontend game plugin config. This shows a "Prevent reusing words" toggle in the admin panel, labeled with all participating game names.

### Backend Contract

Use `sessionStore` with these reserved keys:

- **`shared:reuse-enabled`** (`boolean`, default `true`) — whether reuse prevention is active. Read before accepting a word.
- **`shared:used-words`** (`Set<string>`) — the set of lowercased words already used across all participating games. Read to check; write new words after accepting.

The typical pattern on `submitWord`:
1. Before accepting a word, check `shared:reuse-enabled`. If not `false`, check whether the word exists in `shared:used-words` and reject with `reason: 'used_in_previous_game'` if found.
2. After accepting a word, add it (lowercased) to `shared:used-words`.

See `backend/src/quickFire/quickfire.ts`, `backend/src/multicat/multicat.ts`, `backend/src/lastWordStanding/lastwordstanding.ts`, or `backend/src/alphabetRace/alphabetrace.ts` for reference implementations.

### Important Notes

- Words are stored lowercased. Normalize before checking / inserting.
- The `Set` type in sessionStore is serialized as an array. Access it with `sessionStore.get<Set<string>>(SHARED_KEY)` — the store handles deserialization.
- The toggle defaults to "prevent reuse" (checked). Respect its value even if your game doesn't have its own word-pool logic — it may be reusing a shared engine that handles it for you.

## Code Standards

### Functions and Components

- Functions should stay under 80 lines. If a function is getting too long, break it into smaller focused functions.
- TSX return expressions should stay under 50 lines. If the JSX is getting too long, extract parts into sub-components.
- All styling goes in CSS files — no inline styles.

### Code Duplication

Avoid duplicating code. If you find yourself copying code from another game or file, instead extract it to a shared location (`frontend/src/shared/`, `backend/src/shared/`, or the shared workspace) so all games can use it.

## Testing

LANcade uses **vitest** for testing.

- When adding a new feature, you must also add tests for it. Test coverage, as a percentage of the codebase, must never decrease.
- When fixing a bug, start by writing a test that reproduces the bug. Only then fix the code so the new test passes.

Run the full test suite with:
```bash
npm test
```

## Git Workflow

- Commit messages follow [conventional commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `style:`, `chore:`, etc.
- Code that fails `npm test` or `npm run build` will fail CI checks and cannot be merged, always verify before committing.
- Changes go through pull requests to the `main` branch. Direct pushes to `main` are disabled.

## Documentation

- Keep the README up to date with the state of the repo.
- New functions and classes must have a JSDoc comment explaining what they do.
