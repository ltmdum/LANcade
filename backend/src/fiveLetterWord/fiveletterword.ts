import type { PlayerInfo, PlayerFinishInfo } from '@lancade/shared';
import { createPlayerStore, PlayerStore } from '../shared/stores/player-store.js';
import { loadValidGuesses, loadAnswerWords, pickRandomWord } from './word-list.js';
import { evaluateGuess, type GuessResult, type LetterStatus } from './scoring.js';

export interface FiveLetterWordGameOptions {
  onStateChange?: () => void;
  playerStore?: PlayerStore;
  validWords?: Set<string>;
  answerWords?: string[];
}

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

export { type PlayerFinishInfo };

/** Public match state sent to clients */
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

/** Full game state sent to clients */
export interface FiveLetterWordState {
  serverTime: number;
  players: PlayerInfo[];
  settings: {
    categories: string[];
    selectedCategory: string;
  };
  gameSettings: Record<string, unknown>;
  match: FiveLetterWordMatchState;
}

/** Internal match state */
interface Match {
  id: number;
  state: 'idle' | 'active' | 'grace' | 'finished';
  targetWord: string;
  playerStates: Map<string, PlayerGameState>;
  winnerId: string | null;
  graceEndsAt: number | null;
  finishOrder: { playerId: string; solvedAtRow: number }[];
  graceTimeout: ReturnType<typeof setTimeout> | null;
}

export interface StartRoundResult {
  ok: boolean;
  matchId?: number;
  reason?: string;
}

export interface SubmitWordResult {
  ok: boolean;
  reason?: string;
  result?: GuessResult;
}

const MAX_ROWS = 6;

/**
 * Create an empty match state.
 * @returns Empty match object.
 */
function createEmptyMatch(): Match {
  return {
    id: 0,
    state: 'idle',
    targetWord: '',
    playerStates: new Map(),
    winnerId: null,
    graceEndsAt: null,
    finishOrder: [],
    graceTimeout: null,
  };
}

/**
 * Compute the best result for each row across all players.
 * @param playerStates Map of player states.
 * @returns Array of row best results.
 */
function computeRowBests(playerStates: Map<string, PlayerGameState>): RowBestResult[] {
  const rowBests: RowBestResult[] = [];
  const maxRows = Math.max(0, ...Array.from(playerStates.values()).map(s => s.grid.length));
  
  for (let row = 0; row < maxRows; row++) {
    let bestGreen = 0;
    let bestYellow = 0;
    let bestLetters: LetterStatus[] = ['absent', 'absent', 'absent', 'absent', 'absent'];
    
    for (const state of playerStates.values()) {
      if (row < state.grid.length) {
        const gridRow = state.grid[row];
        const greenCount = gridRow.letters.filter(l => l === 'correct').length;
        const yellowCount = gridRow.letters.filter(l => l === 'present').length;
        
        // Pick best by green count first, then yellow count
        if (greenCount > bestGreen || (greenCount === bestGreen && yellowCount > bestYellow)) {
          bestGreen = greenCount;
          bestYellow = yellowCount;
          bestLetters = [...gridRow.letters];
        }
      }
    }
    
    rowBests.push({
      letters: bestLetters,
      greenCount: bestGreen,
      yellowCount: bestYellow,
    });
  }
  
  return rowBests;
}

/**
 * Create a Five Letter Word game instance.
 * @param options Optional configuration overrides.
 * @returns Five Letter Word game instance.
 */
export function createGame(options: FiveLetterWordGameOptions = {}) {
  const onStateChange = options.onStateChange || (() => {});
  const playerStore = options.playerStore || createPlayerStore();
  const validWords = options.validWords || loadValidGuesses();
  const answerWords = options.answerWords || loadAnswerWords();
  
  let match = createEmptyMatch();
  let hardMode = false;
  let gracePeriodSeconds = 60;

  /**
   * Clear the grace period timeout.
   */
  function clearGraceTimeout(): void {
    if (match.graceTimeout) {
      clearTimeout(match.graceTimeout);
      match.graceTimeout = null;
    }
  }

  /**
   * End the grace period and transition to finished state.
   */
  function endGracePeriod(): void {
    clearGraceTimeout();
    // Mark any unsolved players as out of guesses
    for (const state of match.playerStates.values()) {
      if (!state.solved) {
        match.finishOrder.push({ playerId: state.playerId, solvedAtRow: -1 });
      }
    }
    match.state = 'finished';
    match.graceEndsAt = null;
    notifyChange();
  }

  /**
   * Start the grace period after a player wins.
   */
  function startGracePeriod(): void {
    clearGraceTimeout();
    const durationMs = gracePeriodSeconds * 1000;
    match.graceEndsAt = Date.now() + gracePeriodSeconds * 1000;
    match.graceTimeout = setTimeout(() => {
      endGracePeriod();
    }, durationMs);
  }

  /**
   * Notify listeners that state has changed.
   */
  function notifyChange(): void {
    onStateChange();
  }

  /**
   * Start a new round.
   * @param _durationMs Not used for this game.
   * @returns Result payload for the start attempt.
   */
  function startRound(_durationMs: number): StartRoundResult {
    if (match.state === 'active' || match.state === 'grace') {
      return { ok: false, reason: 'round_active' };
    }

    clearGraceTimeout();

    const playerIds = playerStore.getPlayerIds();
    if (playerIds.length === 0) {
      return { ok: false, reason: 'no_players' };
    }

    // Initialize player states
    const playerStates = new Map<string, PlayerGameState>();
    for (const playerId of playerIds) {
      const playerName = playerStore.getPlayerName(playerId);
      playerStates.set(playerId, {
        playerId,
        playerName,
        grid: [],
        solved: false,
      });
    }

    match = {
      id: match.id + 1,
      state: 'active',
      targetWord: pickRandomWord(answerWords),
      playerStates,
      winnerId: null,
      graceEndsAt: null,
      finishOrder: [],
      graceTimeout: null,
    };

    notifyChange();
    return { ok: true, matchId: match.id };
  }

  /**
   * Submit a word guess.
   * @param playerId Player identifier.
   * @param wordInput Raw word input.
   * @returns Result payload for the submission.
   */
  function submitWord(playerId: string, wordInput: string): SubmitWordResult {
    if (match.state !== 'active' && match.state !== 'grace') {
      return { ok: false, reason: 'round_not_active' };
    }

    if (!playerStore.hasPlayer(playerId)) {
      return { ok: false, reason: 'not_player' };
    }

    const playerState = match.playerStates.get(playerId);
    if (!playerState) {
      return { ok: false, reason: 'not_player' };
    }

    if (playerState.solved) {
      return { ok: false, reason: 'already_solved' };
    }

    if (playerState.grid.length >= MAX_ROWS) {
      return { ok: false, reason: 'out_of_guesses' };
    }

    const word = (wordInput || '').trim().toUpperCase();
    if (word.length !== 5) {
      return { ok: false, reason: 'invalid_length' };
    }

    if (!validWords.has(word)) {
      return { ok: false, reason: 'invalid_word' };
    }

    // Hard mode: green letters must stay in their positions
    if (hardMode && playerState.grid.length > 0) {
      for (const row of playerState.grid) {
        for (let i = 0; i < row.letters.length; i++) {
          if (row.letters[i] === 'correct' && word[i] !== row.word[i]) {
            return { ok: false, reason: 'hard_mode_wrong_position' };
          }
        }
      }
    }

    const result = evaluateGuess(word, match.targetWord);

    // Add guess to player's grid
    playerState.grid.push({
      word,
      letters: result.letters,
    });

    // Check for win
    if (result.correctCount === 5) {
      playerState.solved = true;
      
      if (!match.winnerId) {
        // First player to solve wins
        match.winnerId = playerId;
        match.finishOrder.push({ playerId, solvedAtRow: playerState.grid.length });

        // Check if all players are done (single-player or everyone else out of guesses)
        const allDone = Array.from(match.playerStates.values()).every(
          s => s.solved || s.grid.length >= MAX_ROWS
        );
        if (allDone) {
          match.state = 'finished';
        } else {
          match.state = 'grace';
          startGracePeriod();
        }
        notifyChange();
      } else {
        // Subsequent solve during grace
        match.finishOrder.push({ playerId, solvedAtRow: playerState.grid.length });
        
        // Check if all remaining players are done
        const allDone = Array.from(match.playerStates.values()).every(
          s => s.solved || s.grid.length >= MAX_ROWS
        );
        if (allDone) {
          endGracePeriod();
        } else {
          notifyChange();
        }
      }
      
      return { ok: true, result };
    }

    // Check if this player is out of guesses
    if (playerState.grid.length >= MAX_ROWS) {
      // Check if all players are done (either solved or out of guesses)
      const allDone = Array.from(match.playerStates.values()).every(
        s => s.solved || s.grid.length >= MAX_ROWS
      );
      
      if (allDone) {
        if (match.winnerId) {
          endGracePeriod();
          return { ok: true, result };
        }
        // No winner — mark all players as unsolved in finish order
        for (const state of match.playerStates.values()) {
          match.finishOrder.push({ playerId: state.playerId, solvedAtRow: -1 });
        }
        match.state = 'finished';
        notifyChange();
        return { ok: true, result };
      }
    }

    notifyChange();
    return { ok: true, result };
  }

  /**
   * Join a player and broadcast updated state.
   * @param payload Player join payload.
   * @returns Result payload from the player store.
   */
  function joinPlayer(payload: { name?: string; playerId?: string }) {
    const result = playerStore.joinPlayer(payload);
    if (!result.ok) {
      return result;
    }
    notifyChange();
    return result;
  }

  /**
   * Build the public match state payload.
   * @returns State object for clients.
   */
  function getState(): Omit<FiveLetterWordState, 'game' | 'games'> {
    const winnerName = match.winnerId 
      ? playerStore.getPlayerName(match.winnerId) 
      : null;

    const playerStates = Array.from(match.playerStates.values());
    const rowBests = computeRowBests(match.playerStates);

    const finishOrder: PlayerFinishInfo[] = [];
    for (const entry of match.finishOrder) {
      const state = match.playerStates.get(entry.playerId);
      finishOrder.push({
        playerId: entry.playerId,
        playerName: state ? state.playerName : playerStore.getPlayerName(entry.playerId),
        solvedAtRow: entry.solvedAtRow >= 0 ? entry.solvedAtRow : null,
        solved: entry.solvedAtRow >= 0,
      });
    }

    const revealWord = match.state === 'finished' ||
      (match.state === 'grace' && match.winnerId !== null);

    return {
      serverTime: Date.now(),
      players: playerStore.listPlayers(),
      settings: {
        categories: [],
        selectedCategory: '',
      },
      gameSettings: { hardMode: hardMode ? 1 : 0, gracePeriodSeconds },
      match: {
        id: match.id,
        state: match.state,
        playerStates,
        rowBests,
        targetWord: revealWord ? match.targetWord : null,
        winnerId: match.winnerId,
        winnerName,
        graceEndsAt: match.graceEndsAt,
        finishOrder,
      },
    };
  }

  /**
   * Update game settings from admin.
   * @param settings Settings object.
   * @returns Result payload.
   */
  function updateSettings(settings: Record<string, unknown>) {
    if (match.state === 'active' || match.state === 'grace') {
      return { ok: false, reason: 'game_active' };
    }
    if (settings.hardMode === true || settings.hardMode === 1) {
      hardMode = true;
    } else if (settings.hardMode === false || settings.hardMode === 0) {
      hardMode = false;
    }
    if (typeof settings.gracePeriodSeconds === 'number') {
      const val = settings.gracePeriodSeconds;
      if (Number.isInteger(val) && val >= 15 && val <= 300) {
        gracePeriodSeconds = val;
      }
    }
    notifyChange();
    return { ok: true };
  }

  /**
   * Get the current match phase.
   * @returns Match state string.
   */
  function getPhase(): string {
    return match.state;
  }

  /**
   * End the current game early.
   * @returns Result payload for the end game attempt.
   */
  function endGame() {
    if (match.state !== 'active' && match.state !== 'grace') {
      return { ok: false, reason: 'not_active' };
    }

    clearGraceTimeout();
    if (match.state === 'grace') {
      for (const state of match.playerStates.values()) {
        if (!state.solved) {
          match.finishOrder.push({ playerId: state.playerId, solvedAtRow: -1 });
        }
      }
    } else if (!match.winnerId && match.finishOrder.length === 0) {
      for (const state of match.playerStates.values()) {
        match.finishOrder.push({ playerId: state.playerId, solvedAtRow: -1 });
      }
    }
    match.state = 'finished';
    match.graceEndsAt = null;
    notifyChange();
    return { ok: true };
  }

  /**
   * Submit votes - not used in this game but required by interface.
   */
  function submitVotes(_playerId: string, _payload: unknown) {
    return { ok: false, reason: 'not_supported' };
  }

  /**
   * Clean up timers when the game is disposed.
   */
  function dispose(): void {
    clearGraceTimeout();
  }

  return {
    id: 'fiveletterword',
    name: '5 Letter Word',
    getPhase,
    getState,
    startRound,
    submitWord,
    submitVotes,
    joinPlayer,
    endGame,
    updateSettings,
    dispose,
  };
}

export type FiveLetterWordGame = ReturnType<typeof createGame>;
