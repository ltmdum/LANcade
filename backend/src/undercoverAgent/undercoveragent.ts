import type {
  UndercoverAgentState,
  UndercoverSubmission,
  UndercoverVoteRound,
} from '@lancade/shared';
import { PlayerStore } from '../shared/stores/player-store.js';
import type { SessionStore } from '../shared/stores/session-store.js';
import { normalizeWord } from '../shared/utils/normalize-word.js';
import {
  checkForWinner,
  computeRoundOutcome,
  computeSecretWordOutcome,
  finalizeVoteRound,
  handleReadyAction,
  handleRevealAction,
  loadUsedWords,
  pickRandom,
  saveUsedWords,
  selectRandomWord,
  shuffle,
  startNewVoteRound,
  validateAndRecordVote,
} from '../undercovershared/index.js';
import type {
  SubmitVotesResult,
  SubmitWordResult,
} from '../undercovershared/index.js';

const USED_WORDS_KEY = 'undercoveragent:used-words';
const DEFAULT_WINNING_SCORE = 5;

export interface UndercoverAgentGameOptions {
  onStateChange?: () => void;
  playerStore?: PlayerStore;
  sessionStore?: SessionStore;
}

export interface StartRoundResult {
  ok: boolean;
  roundId?: number;
  reason?: string;
}

export type { SubmitWordResult, SubmitVotesResult };

export interface EndGameResult {
  ok: boolean;
  reason?: string;
}

export interface UndercoverAgentGame {
  id: string;
  name: string;
  getPhase(): string;
  getState(): Omit<UndercoverAgentState, 'game' | 'games'>;
  startRound(durationMs: number): StartRoundResult;
  submitWord(playerId: string, wordInput: string): SubmitWordResult;
  submitVotes(playerId: string, payload: unknown): SubmitVotesResult;
  joinPlayer(payload: { name?: string; playerId?: string }): {
    ok: boolean;
    playerId?: string;
    name?: string;
    error?: string;
  };
  endGame(): EndGameResult;
  updateSettings(settings: Record<string, number>): { ok: boolean; reason?: string };
}

interface Match {
  id: number;
  state: 'idle' | 'reveal' | 'submitting' | 'voting' | 'guessing' | 'finished';
  word: string | null;
  undercoverPlayerId: string | null;
  revealedPlayerIds: Set<string>;
  readyPlayerIds: Set<string>;
  turnOrder: string[];
  currentTurnIndex: number;
  currentTurnPlayerId: string | null;
  submissions: Map<string, string[]>;
  usedWords: Set<string>;
  roundSubmittedPlayerIds: Set<string>;
  voteRounds: UndercoverVoteRound[];
  currentVoteRound: number;
  votedPlayerIds: Set<string>;
  currentVotes: Map<string, string>;
  winnerIsUndercover: boolean;
  finishReason: string | null;
  finalGuess: string | null;
  participants: string[];
}

/**
 * Create an empty match state.
 * @returns Empty match object.
 */
function createEmptyMatch(): Match {
  return {
    id: 0,
    state: 'idle',
    word: null,
    undercoverPlayerId: null,
    revealedPlayerIds: new Set(),
    readyPlayerIds: new Set(),
    turnOrder: [],
    currentTurnIndex: 0,
    currentTurnPlayerId: null,
    submissions: new Map(),
    usedWords: new Set(),
    roundSubmittedPlayerIds: new Set(),
    voteRounds: [],
    currentVoteRound: 0,
    votedPlayerIds: new Set(),
    currentVotes: new Map(),
    winnerIsUndercover: false,
    finishReason: null,
    finalGuess: null,
    participants: [],
  };
}

/**
 * Create an Undercover Agent game instance.
 * @param options Game configuration options.
 * @returns Undercover Agent game instance.
 */
export function createGame(options: UndercoverAgentGameOptions = {}) {
  const onStateChange = options.onStateChange || (() => {});
  const playerStore = options.playerStore;
  const sessionStore = options.sessionStore;

  let match = createEmptyMatch();
  let scores: Record<string, number> = {};
  let roundPoints: Record<string, number> = {};
  let winnerIds: string[] = [];
  let winningScore = DEFAULT_WINNING_SCORE;
  const sessionUsedWords = loadUsedWords(sessionStore, USED_WORDS_KEY);

  /**
   * Notify listeners of state change.
   */
  function notifyChange(): void {
    onStateChange();
  }

  /**
   * Get all player IDs.
   * @returns Array of player IDs.
   */
  function getPlayerIds(): string[] {
    return playerStore ? playerStore.getPlayerIds() : [];
  }

  /**
   * Get player name by ID.
   * @param playerId Player identifier.
   * @returns Player name or fallback.
   */
  function getPlayerName(playerId: string): string {
    return playerStore ? playerStore.getPlayerName(playerId) : 'Unknown';
  }

  /**
   * Build the public submissions list from internal state.
   * @returns Array of submissions showing each player's words.
   */
  function buildPublicSubmissions(): UndercoverSubmission[] {
    const result: UndercoverSubmission[] = [];
    for (const [playerId, words] of match.submissions.entries()) {
      result.push({
        playerId,
        playerName: getPlayerName(playerId),
        words: [...words],
      });
    }
    return result;
  }

  /**
   * Get the current game phase.
   * @returns Phase string.
   */
  function getPhase(): string {
    if (winnerIds.length > 0) return 'finished';
    return match.state;
  }

  /**
   * Build the public game state.
   * @returns Full game state without metadata.
   */
  function getState(): Omit<UndercoverAgentState, 'game' | 'games'> {
    return {
      serverTime: Date.now(),
      players: playerStore ? playerStore.listPlayers() : [],
      settings: { categories: [], selectedCategory: '' },
      gameSettings: { winningScore },
      match: {
        id: match.id,
        state: winnerIds.length > 0 ? 'finished' : match.state,
        word: match.word,
        undercoverPlayerId: match.undercoverPlayerId,
        revealedPlayerIds: [...match.revealedPlayerIds],
        readyPlayerIds: [...match.readyPlayerIds],
        turnOrder: match.turnOrder,
        currentTurnIndex: match.currentTurnIndex,
        currentTurnPlayerId: match.currentTurnPlayerId,
        submissions: buildPublicSubmissions(),
        usedWords: [...match.usedWords],
        roundSubmittedPlayerIds: [...match.roundSubmittedPlayerIds],
        voteRounds: match.voteRounds.map(vr => ({ ...vr })),
        currentVoteRound: match.currentVoteRound,
        votedPlayerIds: [...match.votedPlayerIds],
        winnerIsUndercover: match.winnerIsUndercover,
        finishReason: match.finishReason,
        finalGuess: match.finalGuess,
        participants: match.participants,
        scores: { ...scores },
        roundPoints: { ...roundPoints },
        winnerIds: [...winnerIds],
        winnerNames: winnerIds.map(id => getPlayerName(id)),
        winningScore,
      },
    };
  }

  /**
   * Initialize the reveal phase by picking a word and undercover agent.
   * @param participants Array of player IDs participating.
   */
  function initRevealPhase(participants: string[]): void {
    match.word = selectRandomWord(sessionUsedWords);
    sessionUsedWords.add(match.word!);
    saveUsedWords(sessionStore, USED_WORDS_KEY, sessionUsedWords);
    match.undercoverPlayerId = pickRandom(participants);
    match.revealedPlayerIds = new Set();
    match.readyPlayerIds = new Set();
  }

  /**
   * Transition from reveal to submitting phase.
   */
  function transitionToSubmitting(): void {
    match.state = 'submitting';
    match.turnOrder = shuffle(match.participants);
    match.currentTurnIndex = 0;
    match.currentTurnPlayerId = match.turnOrder[0];
    match.roundSubmittedPlayerIds = new Set();
    notifyChange();
  }

  /**
   * Handle the REVEAL action during reveal phase.
   * @param playerId Player identifier.
   * @returns Result with the player's role.
   */
  function handleReveal(playerId: string): SubmitWordResult {
    const result = handleRevealAction(match, playerId);
    if (result.ok) {
      notifyChange();
    }
    return result;
  }

  /**
   * Handle the READY action during reveal phase.
   * @param playerId Player identifier.
   * @returns Result of the ready action.
   */
  function handleReady(playerId: string): SubmitWordResult {
    const result = handleReadyAction(match, playerId, () => transitionToSubmitting());
    if (result.ok && match.state === 'reveal') {
      notifyChange();
    }
    return result;
  }

  /**
   * Handle word submission during the reveal phase.
   * @param playerId Player identifier.
   * @param wordInput The special command (REVEAL, READY).
   * @returns Submission result.
   */
  function handleRevealPhase(playerId: string, wordInput: string): SubmitWordResult {
    if (!match.participants.includes(playerId)) {
      return { ok: false, reason: 'not_participant' };
    }

    const command = wordInput.trim().toUpperCase();
    if (command === 'REVEAL') return handleReveal(playerId);
    if (command === 'READY') return handleReady(playerId);

    return { ok: false, reason: 'invalid_command' };
  }

  /**
   * Advance to the next turn in the submitting phase.
   */
  function advanceTurn(): void {
    if (match.roundSubmittedPlayerIds.size >= match.participants.length) {
      transitionToVoting();
      return;
    }

    match.currentTurnIndex += 1;
    match.currentTurnPlayerId = match.turnOrder[match.currentTurnIndex];
    notifyChange();
  }

  /**
   * Check if a word has already been submitted by any player.
   * @param word Normalized word to check.
   * @returns True if the word was previously submitted.
   */
  function isWordAlreadySubmitted(word: string): boolean {
    for (const words of match.submissions.values()) {
      if (words.some(w => normalizeWord(w) === word)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Finish the round immediately because someone submitted the secret word.
   * @param revealerId Player who submitted the secret word.
   */
  function finishOnSecretWord(revealerId: string): void {
    const outcome = computeSecretWordOutcome({
      participants: match.participants,
      undercoverPlayerId: match.undercoverPlayerId!,
      currentVotes: match.currentVotes,
      scores,
      revealerId,
    });
    applyOutcome(outcome);
  }

  /**
   * Handle word submission during the submitting phase.
   * @param playerId Player identifier.
   * @param wordInput The word being submitted.
   * @returns Submission result.
   */
  function handleSubmittingPhase(playerId: string, wordInput: string): SubmitWordResult {
    if (playerId !== match.currentTurnPlayerId) {
      return { ok: false, reason: 'not_your_turn' };
    }

    const trimmed = wordInput.trim();
    if (!trimmed) {
      return { ok: false, reason: 'empty' };
    }

    const normalized = normalizeWord(trimmed);
    const isSecretWord = match.word !== null
      && normalized === normalizeWord(match.word);

    if (!isSecretWord && isWordAlreadySubmitted(normalized)) {
      return { ok: false, reason: 'duplicate' };
    }

    const existing = match.submissions.get(playerId) || [];
    existing.push(trimmed);
    match.submissions.set(playerId, existing);
    match.roundSubmittedPlayerIds.add(playerId);

    if (isSecretWord) {
      finishOnSecretWord(playerId);
      notifyChange();
      return { ok: true };
    }

    advanceTurn();
    return { ok: true };
  }

  /**
   * Transition from submitting to voting phase.
   */
  function transitionToVoting(): void {
    match.state = 'voting';
    match.currentVoteRound = 1;
    match.votedPlayerIds = new Set();
    match.currentVotes = new Map();
    match.voteRounds = [];
    notifyChange();
  }

  /**
   * Process the vote results when all players have voted.
   * A tie starts a re-vote; otherwise the round resolves.
   */
  function processVoteResults(): void {
    const { isTie, targetPlayerId } = finalizeVoteRound(match, getPlayerName);
    if (isTie) {
      startNewVoteRound(match);
      notifyChange();
    } else {
      resolveVote(targetPlayerId!);
    }
  }

  /**
   * Resolve a vote: if the target is the agent → guessing, otherwise → scoring.
   * @param targetPlayerId The player who received the most votes.
   */
  function resolveVote(targetPlayerId: string): void {
    if (targetPlayerId === match.undercoverPlayerId) {
      match.state = 'guessing';
      notifyChange();
    } else {
      resolveRound(false, null);
    }
  }

  /**
   * Handle the undercover agent's final guess at the secret word.
   * @param playerId Player identifier.
   * @param wordInput The guessed word.
   * @returns Submission result.
   */
  function handleGuessingPhase(playerId: string, wordInput: string): SubmitWordResult {
    if (playerId !== match.undercoverPlayerId) {
      return { ok: false, reason: 'not_undercover' };
    }

    const trimmed = wordInput.trim();
    if (!trimmed) {
      return { ok: false, reason: 'empty' };
    }

    match.finalGuess = trimmed;

    const guessCorrect = match.word !== null && normalizeWord(trimmed) === normalizeWord(match.word);
    resolveRound(true, guessCorrect);
    return { ok: true };
  }

  /**
   * Apply a computed round outcome and advance the match state.
   * @param outcome Outcome computed by the shared scoring module.
   */
  function applyOutcome(outcome: {
    roundPoints: Record<string, number>;
    winnerIsUndercover: boolean;
    finishReason: string;
  }): void {
    roundPoints = outcome.roundPoints;
    match.winnerIsUndercover = outcome.winnerIsUndercover;
    match.finishReason = outcome.finishReason;
    winnerIds = checkForWinner(scores, winningScore);
    match.state = winnerIds.length > 0 ? 'finished' : 'idle';
  }

  /**
   * Resolve the round with scoring and winner check.
   * @param agentWasCaught Whether the agent was caught by vote.
   * @param agentGuessedCorrectly Whether the agent guessed the word (null if no guess phase).
   */
  function resolveRound(agentWasCaught: boolean, agentGuessedCorrectly: boolean | null): void {
    const outcome = computeRoundOutcome({
      participants: match.participants,
      undercoverPlayerId: match.undercoverPlayerId!,
      currentVotes: match.currentVotes,
      scores,
      agentWasCaught,
      agentGuessedCorrectly,
    });
    applyOutcome(outcome);
    notifyChange();
  }

  /**
   * Start a new word round.
   * @param _durationMs Unused (rounds are fixed at 1 submission round per word).
   * @returns Start result.
   */
  function startRound(_durationMs: number): StartRoundResult {
    const playerIds = getPlayerIds();
    if (playerIds.length < 3) {
      return { ok: false, reason: 'need_3_players' };
    }

    const participants = [...playerIds];

    match = createEmptyMatch();
    match.id += 1;
    match.state = 'reveal';
    match.participants = participants;

    // Carry over scores and winningScore from previous rounds
    for (const pid of participants) {
      if (scores[pid] === undefined) {
        scores[pid] = 0;
      }
    }
    roundPoints = {};

    initRevealPhase(participants);
    notifyChange();
    return { ok: true, roundId: match.id };
  }

  /**
   * Submit a word or command during gameplay.
   * Routes to the appropriate handler based on the current phase.
   * @param playerId Player identifier.
   * @param wordInput Word or command to submit.
   * @returns Submission result.
   */
  function submitWord(playerId: string, wordInput: string): SubmitWordResult {
    if (match.state === 'reveal') {
      return handleRevealPhase(playerId, wordInput);
    }
    if (match.state === 'submitting') {
      return handleSubmittingPhase(playerId, wordInput);
    }
    if (match.state === 'guessing') {
      return handleGuessingPhase(playerId, wordInput);
    }
    return { ok: false, reason: 'invalid_state' };
  }

  /**
   * Submit a vote for who the player thinks is the undercover agent.
   * Players cannot vote for themselves.
   * @param playerId Voter player ID.
   * @param payload Vote payload containing targetPlayerId.
   * @returns Vote result.
   */
  function submitVotes(playerId: string, payload: unknown): SubmitVotesResult {
    if (match.state !== 'voting') {
      return { ok: false, reason: 'not_voting' };
    }

    const result = validateAndRecordVote(match, playerId, payload);
    if (!result.ok) {
      return result;
    }

    if (match.votedPlayerIds.size >= match.participants.length) {
      processVoteResults();
    } else {
      notifyChange();
    }

    return { ok: true };
  }

  /**
   * Join a player to the game.
   * @param payload Join payload with name and optional playerId.
   * @returns Join result.
   */
  function joinPlayer(payload: { name?: string; playerId?: string }): {
    ok: boolean;
    playerId?: string;
    name?: string;
    error?: string;
  } {
    if (!playerStore) {
      return { ok: false, error: 'no_player_store' };
    }
    const result = playerStore.joinPlayer(payload);
    if (result.ok) {
      if (result.playerId && scores[result.playerId] === undefined) {
        scores[result.playerId] = 0;
      }
      notifyChange();
    }
    return result;
  }

  /**
   * Update admin-configurable settings (only when idle).
   * @param settings Settings object with winningScore.
   * @returns Result indicating success or failure.
   */
  function updateSettings(settings: Record<string, number>): { ok: boolean; reason?: string } {
    if (match.state !== 'idle') return { ok: false, reason: 'game_active' };
    let changed = false;
    for (const key of Object.keys(settings)) {
      const val = settings[key];
      if (key === 'winningScore') {
        if (typeof val !== 'number' || !Number.isInteger(val) || val < 1 || val > 50) {
          return { ok: false, reason: 'invalid_value' };
        }
        winningScore = val;
        changed = true;
      } else {
        return { ok: false, reason: 'unknown_setting' };
      }
    }
    if (changed) notifyChange();
    return { ok: true };
  }

  /**
   * End the current game, returning to idle state.
   * @returns End result.
   */
  function endGame(): EndGameResult {
    if (match.state === 'idle' && winnerIds.length === 0) {
      return { ok: false, reason: 'not_active' };
    }
    match = createEmptyMatch();
    scores = {};
    roundPoints = {};
    winnerIds = [];
    notifyChange();
    return { ok: true };
  }

  return {
    id: 'undercoveragent',
    name: 'Undercover Agent',
    getPhase,
    getState,
    startRound,
    submitWord,
    submitVotes,
    joinPlayer,
    updateSettings,
    endGame,
  };
}
