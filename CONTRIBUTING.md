# Contributing to LANcade

## Getting Started

- Use `npm install` (yarn is not used in this project).
- Start the dev server with `npm run dev` — this runs both the backend (`localhost:3000`) and frontend (`localhost:5173`) with hot reload.
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
│   ├── extract-word-lists.js   # Generates per-length word JSON files
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
│       │   ├── utils/              # Nine Dash specific utility functions (tile validation)
│       │   ├── NineDashGame.tsx
│       │   └── plugin.tsx          # Nine Dash frontend plugin registration
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
│       │   ├── word-list.ts    # Word list loading utilities (reads from word-list package)
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
│       │   ├── word-source.ts  # Loads nine-letter words from the word-list package
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
    { "id": "quickfire", "displayName": "Category Clash: Quick Fire" },
    { "id": "lastwordstanding", "displayName": "Last Word Standing" }
  ]
}
```

Each entry has an `id` (matching the game plugin ID) and a `displayName` (shown in app UI). The config is validated at build time — invalid IDs or an empty list will fail the build.

## Adding a New Game

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
    { "id": "quickfire", "displayName": "Category Clash: Quick Fire" },
    { "id": "multicat", "displayName": "Category Clash: Multicat" },
    { "id": "lastwordstanding", "displayName": "Last Word Standing" },
    { "id": "yourgame", "displayName": "Your Game Name" }
  ]
}
```

### 9. Add Tests

Create tests for your game logic in `backend/src/tests/yourgame/`. If your game has a frontend component, add frontend tests too.

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
