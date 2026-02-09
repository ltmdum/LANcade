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
}

export interface CategoryClashState {
  serverTime: number;
  players: PlayerInfo[];
  settings: CategorySettings;
  round: CategoryClashRoundState;
  game: GameInfo;
  games: GameInfo[];
}

// WordRush types
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

export interface WordRushMatchState {
  id: number;
  state: 'idle' | 'active' | 'voting' | 'finished';
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
  winnerId: string | null;
}

export interface WordRushState {
  serverTime: number;
  players: PlayerInfo[];
  settings: CategorySettings;
  match: WordRushMatchState;
  game: GameInfo;
  games: GameInfo[];
}

// Word Sprint types
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

export interface WordSprintMatchState {
  id: number;
  state: 'idle' | 'active' | 'finished';
  playerStates: PlayerGameState[];
  rowBests: RowBestResult[];
  targetWord: string | null;
  winnerId: string | null;
  winnerName: string | null;
}

export interface WordSprintState {
  serverTime: number;
  players: PlayerInfo[];
  settings: CategorySettings;
  match: WordSprintMatchState;
  game: GameInfo;
  games: GameInfo[];
}

// BlankSlate types
export interface BlankSlatePrompt {
  id: number;
  text: string;
  blankPosition: 'before' | 'after';
}

export interface BlankSlateSubmission {
  playerId: string;
  playerName: string;
  word: string;
}

export interface BlankSlateClaim {
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
}

export interface BlankSlateWordGroup {
  word: string;
  playerIds: string[];
  playerNames: string[];
  points: number;
}

export interface BlankSlateRoundResult {
  groups: BlankSlateWordGroup[];
  scoreChanges: Record<string, number>;
}

export interface BlankSlateRoundState {
  id: number;
  state: 'idle' | 'submitting' | 'claiming' | 'voting' | 'results';
  prompt: BlankSlatePrompt | null;
  submissions: BlankSlateSubmission[];
  submittedPlayerIds: string[];
  durationMs: number | null;
  startedAt: number | null;
  endsAt: number | null;
  claims: BlankSlateClaim[];
  currentClaimIndex: number;
  result: BlankSlateRoundResult | null;
}

export interface BlankSlateState {
  serverTime: number;
  players: PlayerInfo[];
  settings: CategorySettings;
  round: BlankSlateRoundState;
  scores: Record<string, number>;
  winnerId: string | null;
  winnerName: string | null;
  game: GameInfo;
  games: GameInfo[];
}

// Union type for any game state
export type GameState = CategoryClashState | WordRushState | WordSprintState | BlankSlateState;

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
