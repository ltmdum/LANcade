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
6. Check the console output for the player and admin invite URLs.
7. Open on your LAN device using the printed invite link:
   - Players: `http(s)://<host-ip>:3000/p/<player-key>`
   - Admin: `http(s)://<host-ip>:3000/admin/<admin-key>`

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

A CI workflow (`.github/workflows/ci.yml`) runs `npm ci` → `npm run build` → `npm test` on every push to `main` and every PR targeting `main`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture, code standards, testing guidelines, project structure, and step-by-step instructions for adding a new game.

## Available Games

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
| `ninedash` | Nine Dash | Build words from a 3x3 grid of jumbled letters          |
| `telepathy` | Telepathy | Place cards in ascending order without skipping others    |

Games are configured via `games.config.json` in the project root. See [CONTRIBUTING.md](CONTRIBUTING.md) for the config format and instructions on adding or removing games.

## Admin + Player Access

- Each server start generates a random admin key and a random player key, and prints both as invite URLs to the console.
- Visiting `/admin/<admin-key>` grants admin access. Visiting `/p/<player-key>` grants player access. Both are LAN-only.
- Players pick a unique display name when they join.
- The admin panel has a "Play this game" toggle (default on). With it on, the admin joins as a player and participates in the round. With it off, the admin spectates: the round UI is visible (current letter, voting, results) but submit and vote controls are hidden.
- The admin selects which game to run, changes game settings, and ejects players from the admin panel.
- Player identity persists across game switches via localStorage (`playerId`, `playerName`).
- Rate limiting: 10 failed access attempts from the same IP within 60 seconds block that IP for 60 seconds. A failed attempt is a visit to an invalid invite URL (`/p/<wrong>`, `/admin/<wrong>`, or any unknown path) or an API request with a missing or wrong key.

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
- Admin configures cards per player (1-13), inactivity timeout, and an optional auto-submit timer.
- **Auction Phase**: Players are dealt cards and submit blind bid/offer pairs.
  - Crossed orders are matched off (highest bid with lowest offer, at the midpoint price).
  - Remaining unmatched orders form the initial orderbook.
- **Continuous Trading**: Players adjust bid/offer pairs in real-time.
  - Orders match at the passive (existing) order's price.
  - An inactivity timer resets on every trade; when it expires, the round ends.
  - At the start of each new round, one card per player is revealed to everyone.
  - The number of trading rounds equals the number of cards per player, plus one.
  - In the final round, all cards are revealed — fastest traders get the best prices.
- **Auto-Submit**: When enabled, if a player's order gets filled, they have a configurable countdown to adjust their values before the system automatically resubmits. The countdown is shown in the Submit button.
- **Settlement**: Outstanding positions are settled at the true value (sum of all cards).
- **Scoring**: Highest total P&L (realized + settlement) wins.
- Card-related utilities are shared in `shared/src/cards.ts`, `backend/src/shared/cards/`, and `frontend/src/shared/cards/` for reuse by future card games.

### Nine Dash
- A timed word game played on a 3x3 grid of nine jumbled letter tiles.
- Each round draws a hidden nine-letter word from an open-source word list and shuffles its letters into the grid, so the tiles never spell the source word.
- Players submit as many words as they can using only the available tiles. Each tile may be used once per word; a letter that appears on multiple tiles may be reused that many times.
- The frontend rejects words that use letters not on the grid before they reach the server, and the server enforces the same rule.
- A word that has already been submitted (by anyone) is rejected and scores nothing.
- Every accepted word scores one point per letter, so longer words are worth more.
- When the timer ends, voting and scoring mirror Category Clash: words are shown anonymously, only players who submitted words can vote, and a word downvoted by at least half of the voters is removed. Highest score wins.
- Nine Dash reuses the shared Category Clash engine via injectable hooks for grid generation, letter-tile validation, and length-based scoring (`backend/src/categoryclashshared/categoryclash-engine.ts`).
- Nine-letter seed words are loaded at runtime from the open-source [`word-list`](https://www.npmjs.com/package/word-list) package by filtering for words that are exactly nine letters long.

### Telepathy
- A pressure game where you must judge whether your lowest card is lower than everyone else's — or risk losing the round.
- Requires at least 2 players to start.
- There is a deck of 100 cards numbered 1–100. Each round, every player receives `round` cards (round 1 = 1 card, round 2 = 2 cards, etc.).
- Your hand is visible only to you. A shared pile shows the last card that was successfully placed.
- Anyone can place at any time by pressing the Place button, which plays your **lowest** card.
- When you place, the game checks whether any other player still holds a card lower than yours. If so, **you lose the round** — the player with the lower card blocks you.
- If no one has a lower card, your placement succeeds and your card moves to the shared pile.
- The round ends when all cards are placed (round won) or a player is blocked (round lost).
- After a loss, the next round reduces everyone's card count by 1 (easier). After a complete round, the card count increases by 1 (harder).
- Win by reaching the target round: `floor(100 / number of players)`.

## Custom Categories

Games that use categories (Category Clash: Quick Fire, Category Clash: Multicat, Last Word Standing, Alphabet Race) support admin-added custom categories. In the admin panel, use the "Add" input below the category selector to add a custom category to the list. Custom categories persist for the duration of the server session.

## Configuration

Environment variables:
- `HOST` (optional): bind address. When not set and `LAN_ONLY` is true, the server auto-discovers private network interfaces and binds to each one. Set this explicitly to override (e.g., `HOST=192.168.1.5`).
- `PORT` (default `3000`)
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
