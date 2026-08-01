// Player types
export interface PlayerInfo {
  id: string;
  name: string;
}

// Game info
export interface GameInfo {
  id: string;
  name: string;
}

// Category settings
export interface CategorySettings {
  categories: string[];
  selectedCategory: string;
  selectedCategories?: string[];
  categoryMode?: 'single' | 'multi';
}

// Category Clash types
export interface WordEntry {
  id: string;
  word: string;
  category: string;
}

export interface WordsByPlayerEntry {
  playerId: string;
  playerName: string;
  words: WordEntry[];
}

export interface PlayerWordResult {
  word: string;
  category: string | null;
  status: 'accepted' | 'voted_out' | 'rejected';
  blockedByName: string | null;
  downvotedByNames: string[];
}

export interface PlayerResult {
  name: string;
  totalSubmitted: number;
  rejected: number;
  votedOut: number;
  finalScore: number;
  words: PlayerWordResult[];
}

/** A single anonymous word entry used during the voting phase. */
export interface AnonymousWordEntry {
  id: string;
  word: string;
  category: string;
}

export interface CategoryClashRoundState {
  id: number;
  state: 'idle' | 'active' | 'voting' | 'results';
  letter: string | null;
  /** Available letter tiles for grid-style games (e.g. Nine Dash). Null for
   *  games that do not use a letter tray. */
  letters?: string[] | null;
  /** The hidden nine-letter source word for a Nine Dash round. Null or absent
   *  for non-grid games. Revealed once the round enters voting/results. */
  sourceWord?: string | null;
  category: string | null;
  categories: string[];
  durationMs: number | null;
  startedAt: number | null;
  endsAt: number | null;
  participants: string[];
  scoresByPlayer: Record<string, number>;
  wordsByPlayer: WordsByPlayerEntry[];
  /** Flat list of every accepted word in submission order with no player
   *  identity attached.  Populated only while the round is in the voting
   *  phase so voters cannot tell who wrote what. */
  anonymousWords?: AnonymousWordEntry[];
  votesSubmittedIds: string[];
  resultsByPlayer: Record<string, PlayerResult> | null;
  /** Player ids with the highest final score once the round has results. */
  winnerIds: string[];
  /** Names of the winning player(s), in the same order as winnerIds. */
  winnerNames: string[];
}

export interface CategoryClashState {
  serverTime: number;
  players: PlayerInfo[];
  settings: CategorySettings;
  round: CategoryClashRoundState;
  game: GameInfo;
  games: GameInfo[];
}

// Last Word Standing types
export interface UsedWord {
  word: string;
  playerId: string;
}

export interface LastOutcome {
  playerId: string;
  word: string | null;
  outcome: string;
  lastChance: boolean;
}

export interface VotesInfo {
  submittedIds: string[];
  rejectCount: number;
  acceptCount: number;
  totalEligible: number;
  voteEndsAt: number | null;
}

export interface LastWordStandingRevival {
  id: number;
  wordNumber: number;
  revivedPlayerIds: string[];
}

export interface LastWordStandingMatchState {
  id: number;
  state: 'idle' | 'active' | 'voting' | 'finished' | 'revival-ready';
  category: string | null;
  timeLimitMs: number | null;
  order: string[];
  activePlayerIds: string[];
  eliminatedPlayerIds: string[];
  currentPlayerId: string | null;
  currentLetter: string | null;
  lastChance: boolean;
  turnStartedAt: number | null;
  turnEndsAt: number | null;
  pendingWord: { word: string; playerId: string } | null;
  votes: VotesInfo | null;
  usedWords: UsedWord[];
  lastOutcome: LastOutcome | null;
  scores: Record<string, number>;
  winnerId: string | null;
  winnerIds: string[];
  winnerNames: string[];
  lastRevival: LastWordStandingRevival | null;
  revivalReadyPlayerIds: string[];
}

export interface LastWordStandingState {
  serverTime: number;
  players: PlayerInfo[];
  settings: CategorySettings;
  match: LastWordStandingMatchState;
  game: GameInfo;
  games: GameInfo[];
}

// Five Letter Word types
export type LetterStatus = 'correct' | 'present' | 'absent';

/** A single row in a player's grid */
export interface PlayerGridRow {
  word: string;
  letters: LetterStatus[];
}

/** Per-player game state */
export interface PlayerGameState {
  playerId: string;
  playerName: string;
  grid: PlayerGridRow[];
  solved: boolean;
}

/** Best result across all players for a given row */
export interface RowBestResult {
  letters: LetterStatus[];
  greenCount: number;
  yellowCount: number;
}

export interface PlayerFinishInfo {
  playerId: string;
  playerName: string;
  solvedAtRow: number | null;
  solved: boolean;
}

export interface FiveLetterWordMatchState {
  id: number;
  state: 'idle' | 'active' | 'grace' | 'finished';
  playerStates: PlayerGameState[];
  rowBests: RowBestResult[];
  targetWord: string | null;
  winnerId: string | null;
  winnerName: string | null;
  graceEndsAt: number | null;
  finishOrder: PlayerFinishInfo[];
}

export interface FiveLetterWordState {
  serverTime: number;
  players: PlayerInfo[];
  settings: CategorySettings;
  gameSettings: Record<string, number>;
  match: FiveLetterWordMatchState;
  game: GameInfo;
  games: GameInfo[];
}

// Mind Match types
export interface MindMatchPrompt {
  id: number;
  text: string;
  blankPosition: 'before' | 'after';
}

export interface MindMatchSubmission {
  playerId: string;
  playerName: string;
  word: string;
}

export interface MindMatchClaim {
  claimantId: string;
  claimantName: string;
  claimantWord: string;
  targetWord: string;
  targetPlayerIds: string[];
  votes: Record<string, 'accept' | 'reject'>;
  resolved: boolean;
  accepted: boolean;
  /** True when both unique-word players claimed each other */
  isMutual: boolean;
  /** Original submission words for all involved players */
  involvedPlayers?: Record<string, string>;
  /** True when a mutual claim was abandoned (only one player claimed) */
  abandonedMutual?: boolean;
}

export interface MindMatchWordGroup {
  word: string;
  playerIds: string[];
  playerNames: string[];
  points: number;
}

export interface MindMatchRoundResult {
  groups: MindMatchWordGroup[];
  scoreChanges: Record<string, number>;
}

export interface MindMatchRoundState {
  id: number;
  state: 'idle' | 'submitting' | 'claiming' | 'voting' | 'voting_results' | 'results';
  prompt: MindMatchPrompt | null;
  submissions: MindMatchSubmission[];
  submittedPlayerIds: string[];
  durationMs: number | null;
  startedAt: number | null;
  endsAt: number | null;
  claimableTargets: Record<string, string[]>;
  claims: MindMatchClaim[];
  currentClaimIndex: number;
  result: MindMatchRoundResult | null;
}

export interface MindMatchState {
  serverTime: number;
  players: PlayerInfo[];
  settings: CategorySettings;
  gameSettings: Record<string, number>;
  round: MindMatchRoundState;
  scores: Record<string, number>;
  winnerIds: string[];
  winnerNames: string[];
  game: GameInfo;
  games: GameInfo[];
}

// Alphabet Race types
export interface AlphabetRaceMatchState {
  id: number;
  state: 'idle' | 'racing' | 'voting' | 'finished';
  category: string | null;
  letterSequence: string[];
  currentLetterIndex: number;
  currentLetter: string | null;
  submittedWord: string | null;
  submittedBy: string | null;
  submittedByName: string | null;
  voteTimeoutMs: number;
  voteEndsAt: number | null;
  votesAccept: number;
  votesReject: number;
  votedPlayerIds: string[];
  eligibleVoterCount: number;
  scores: Record<string, number>;
  ineligiblePlayerIds: string[];
  completedCount: number;
  participants: string[];
  winnerIds: string[];
  winnerNames: string[];
}

export interface AlphabetRaceState {
  serverTime: number;
  players: PlayerInfo[];
  settings: CategorySettings;
  match: AlphabetRaceMatchState;
  game: GameInfo;
  games: GameInfo[];
}

// Undercover Agent types
export interface UndercoverSubmission {
  playerId: string;
  playerName: string;
  words: string[];
}

export interface UndercoverVoteTally {
  playerId: string;
  playerName: string;
  count: number;
}

export interface UndercoverVoteRound {
  tally: UndercoverVoteTally[];
  votedPlayerIds: string[];
  isTie: boolean;
  targetPlayerId: string | null;
}

export interface UndercoverAgentMatchState {
  id: number;
  state: 'idle' | 'reveal' | 'submitting' | 'discussion' | 'voting' | 'guessing' | 'finished';
  word: string | null;
  undercoverPlayerId: string | null;
  revealedPlayerIds: string[];
  readyPlayerIds: string[];
  turnOrder: string[];
  currentTurnIndex: number;
  currentTurnPlayerId: string | null;
  submissions: UndercoverSubmission[];
  usedWords: string[];
  roundSubmittedPlayerIds: string[];
  discussionReadyPlayerIds: string[];
  voteRounds: UndercoverVoteRound[];
  currentVoteRound: number;
  votedPlayerIds: string[];
  winnerIsUndercover: boolean;
  finishReason: string | null;
  finalGuess: string | null;
  participants: string[];
  scores: Record<string, number>;
  roundPoints: Record<string, number>;
  winnerIds: string[];
  winnerNames: string[];
  winningScore: number;
}

export interface UndercoverAgentState {
  serverTime: number;
  players: PlayerInfo[];
  settings: CategorySettings;
  gameSettings: Record<string, number>;
  match: UndercoverAgentMatchState;
  game: GameInfo;
  games: GameInfo[];
}

// Trading Exchange types
import type { Card } from './cards.js';

export interface TradingExchangeOrder {
  playerId: string;
  playerName: string;
  bid: number | null;
  offer: number | null;
}

export interface TradingExchangeTrade {
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  price: number;
  timestamp: number;
}

export interface TradingExchangeLeaderboardEntry {
  playerId: string;
  playerName: string;
  pnl: number;
}

export interface TradingExchangeMatchState {
  id: number;
  state: 'idle' | 'auction' | 'trading' | 'finished';
  cardsPerPlayer: number;
  inactivityTimeoutMs: number;
  autoSubmitMs: number;
  playerCards: Record<string, Card[]>;
  revealedCardCount: number;
  currentRound: number;
  totalRounds: number;
  orders: TradingExchangeOrder[];
  trades: TradingExchangeTrade[];
  roundEndsAt: number | null;
  autoSubmitEndsAt: Record<string, number>;
  playerColours: Record<string, string>;
  participants: string[];
  auctionSubmittedIds: string[];
  winnerIds: string[];
  winnerNames: string[];
  leaderboard: TradingExchangeLeaderboardEntry[] | null;
  trueValue: number | null;
}

export interface TradingExchangeState {
  serverTime: number;
  players: PlayerInfo[];
  settings: CategorySettings;
  gameSettings: Record<string, number>;
  exchange: TradingExchangeMatchState;
  game: GameInfo;
  games: GameInfo[];
}

// Telepathy types
export interface TelepathyLossDetails {
  placedByPlayerId: string;
  placedCard: number;
  blockedByPlayerId: string;
  blockedCard: number;
  round: number;
}

export interface TelepathyGameState {
  phase: 'idle' | 'playing' | 'round_complete' | 'lost' | 'won';
  round: number;
  targetRound: number;
  lastPlaced: number | null;
  totalPlaced: number;
  totalCardsInRound: number;
  /** Each player's hand. Null when idle. */
  hands: Record<string, number[]> | null;
  lossDetails: TelepathyLossDetails | null;
}

export interface TelepathyState {
  serverTime: number;
  players: PlayerInfo[];
  settings: CategorySettings;
  gameSettings: Record<string, number>;
  telepathy: TelepathyGameState;
  game: GameInfo;
  games: GameInfo[];
}

// Union type for any game state
export type GameState = CategoryClashState | LastWordStandingState | FiveLetterWordState | MindMatchState | AlphabetRaceState | UndercoverAgentState | TradingExchangeState | TelepathyState;

// API response types
export interface ApiResult {
  ok: boolean;
  error?: string;
  reason?: string;
}

export interface JoinPlayerResult extends ApiResult {
  playerId?: string;
  name?: string;
}

export interface StartRoundResult extends ApiResult {
  roundId?: number;
  matchId?: number;
  letter?: string;
  currentPlayerId?: string;
}

export interface SubmitWordResult extends ApiResult {
  accepted?: boolean;
  blockedByName?: string;
}

export interface AdminClaimResult {
  sessionId: string;
  expiresAt: number;
}
