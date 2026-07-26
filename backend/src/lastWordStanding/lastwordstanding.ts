import {
  categories,
  type LastWordStandingState,
  type LastWordStandingMatchState,
  type UsedWord,
  type LastOutcome,
} from '@lancade/shared';
import { createGameBase } from '../shared/stores/game-base.js';
import type { SessionStore } from '../shared/stores/session-store.js';
import { randomLetter } from '../shared/utils/letters.js';
import { PlayerStore } from '../shared/stores/player-store.js';

const SHARED_KEY = 'shared:used-words';

export interface LastWordStandingGameOptions {
  onStateChange?: () => void;
  playerStore?: PlayerStore;
  sessionStore?: SessionStore;
}

interface PendingWord {
  word: string;
  key: string;
  playerId: string;
}

interface Match {
  id: number;
  state: 'idle' | 'active' | 'voting' | 'finished';
  category: string | null;
  timeLimitMs: number | null;
  order: string[];
  activePlayerIds: Set<string>;
  eliminatedPlayerIds: Set<string>;
  currentIndex: number;
  currentPlayerId: string | null;
  currentLetter: string | null;
  lastChance: boolean;
  turnStartedAt: number | null;
  turnEndsAt: number | null;
  pendingWord: PendingWord | null;
  votesByPlayer: Map<string, string>;
  voteEndsAt: number | null;
  usedWordKeys: Set<string>;
  usedWords: UsedWord[];
  lastOutcome: LastOutcome | null;
  winnerId: string | null;
}

export interface StartRoundResult {
  ok: boolean;
  matchId?: number;
  currentPlayerId?: string;
  reason?: string;
}

export interface SubmitWordResult {
  ok: boolean;
  reason?: string;
}

export interface SubmitVotesResult {
  ok: boolean;
  reason?: string;
}

export interface EndGameResult {
  ok: boolean;
  reason?: string;
}

export interface LastWordStandingGame {
  id: string;
  name: string;
  categories: string[];
  getPhase(): string;
  getState(): Omit<LastWordStandingState, 'game' | 'games'>;
  startRound(durationMs: number): StartRoundResult;
  submitWord(playerId: string, wordInput: string): SubmitWordResult;
  submitVotes(playerId: string, payload: unknown): SubmitVotesResult;
  joinPlayer(payload: { name?: string; playerId?: string }): { ok: boolean; playerId?: string; name?: string; error?: string };
  selectCategory(category: string): { ok: boolean; category?: string; reason?: string };
  selectRandomCategory(): { ok: boolean; category?: string; reason?: string };
  addCategory(name: string): { ok: boolean; category?: string; reason?: string };
  endGame(): EndGameResult;
}

/**
 * Create an empty match state.
 * @returns Empty match object.
 */
function createEmptyMatch(): Match {
  return {
    id: 0,
    state: 'idle',
    category: null,
    timeLimitMs: null,
    order: [],
    activePlayerIds: new Set(),
    eliminatedPlayerIds: new Set(),
    currentIndex: 0,
    currentPlayerId: null,
    currentLetter: null,
    lastChance: false,
    turnStartedAt: null,
    turnEndsAt: null,
    pendingWord: null,
    votesByPlayer: new Map(),
    voteEndsAt: null,
    usedWordKeys: new Set(),
    usedWords: [],
    lastOutcome: null,
    winnerId: null,
  };
}

/**
 * Create a Last Word Standing game instance.
 * @param options Optional configuration overrides.
 * @returns Last Word Standing game instance.
 */
export function createGame(options: LastWordStandingGameOptions = {}): LastWordStandingGame {
  const onStateChange = options.onStateChange || (() => {});
  const sessionStore = options.sessionStore;
  let match = createEmptyMatch();
  let turnTimeout: ReturnType<typeof setTimeout> | null = null;
  let voteTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Notify listeners that state has changed.
   */
  function notifyChange(): void {
    onStateChange();
  }

  const { playerStore, categoryManager, buildBaseState } = createGameBase({
    categories,
    onChange: notifyChange,
    canChange: () => match.state !== 'active' && match.state !== 'voting',
    playerStore: options.playerStore,
  });

  /**
   * Clear any active turn timeout.
   */
  function clearTurnTimer(): void {
    if (turnTimeout) {
      clearTimeout(turnTimeout);
      turnTimeout = null;
    }
  }

  /**
   * Clear any active vote timeout.
   */
  function clearVoteTimer(): void {
    if (voteTimeout) {
      clearTimeout(voteTimeout);
      voteTimeout = null;
    }
  }

  /**
   * Shuffle a list using Fisher-Yates.
   * @param array Input array.
   * @returns New shuffled array.
   */
  function shuffle<T>(array: T[]): T[] {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Check if a player is still active in the match.
   * @param playerId Player identifier.
   * @returns True if the player is active.
   */
  function isActivePlayer(playerId: string): boolean {
    return match.activePlayerIds.has(playerId);
  }

  /**
   * Get the list of eligible voters for the current pending word.
   * @returns Array of player ids eligible to vote.
   */
  function getEligibleVoters(): string[] {
    // All players in the match (active or eliminated) can vote, except the current player
    return match.order.filter((id) => id !== match.currentPlayerId);
  }

  /**
   * Determine if a winner exists and finalize match if so.
   * @returns True when the match ended with a winner.
   */
  function markWinnerIfReady(): boolean {
    if (match.activePlayerIds.size === 1) {
      const [winnerId] = Array.from(match.activePlayerIds);
      match.state = 'finished';
      match.winnerId = winnerId;
      match.currentPlayerId = winnerId;
      match.currentLetter = null;
      match.pendingWord = null;
      match.votesByPlayer = new Map();
      clearTurnTimer();
      notifyChange();
      return true;
    }
    return false;
  }

  /**
   * Start a new turn with a fresh letter and timeout.
   * @param durationMs Turn duration in milliseconds.
   */
  function startTurn(durationMs: number): void {
    clearTurnTimer();
    const now = Date.now();
    match.state = 'active';
    match.currentLetter = randomLetter();
    match.turnStartedAt = now;
    match.turnEndsAt = now + durationMs;
    turnTimeout = setTimeout(() => {
      handleTimeout();
    }, durationMs);
  }

  /**
   * Advance to the next active player in the order.
   */
  function advanceToNextPlayer(): void {
    if (markWinnerIfReady()) {
      return;
    }

    const order = match.order;
    let index = match.currentIndex;
    for (let step = 0; step < order.length; step += 1) {
      index = (index + 1) % order.length;
      if (match.activePlayerIds.has(order[index])) {
        match.currentIndex = index;
        match.currentPlayerId = order[index];
        match.lastChance = false;
        match.pendingWord = null;
        match.votesByPlayer = new Map();
        startTurn(match.timeLimitMs!);
        notifyChange();
        return;
      }
    }
  }

  /**
   * Eliminate the current player and handle last chance state.
   * @param outcome Outcome string for the elimination.
   */
  function eliminateCurrent(outcome: string): void {
    if (!match.currentPlayerId) {
      return;
    }
    match.activePlayerIds.delete(match.currentPlayerId);
    match.eliminatedPlayerIds.add(match.currentPlayerId);
    match.lastOutcome = {
      playerId: match.currentPlayerId,
      word: match.pendingWord ? match.pendingWord.word : null,
      outcome,
      lastChance: match.lastChance,
    };
    match.lastChance = false;
    match.pendingWord = null;
    match.votesByPlayer = new Map();
    clearTurnTimer();
    if (!markWinnerIfReady()) {
      advanceToNextPlayer();
    }
  }

  /**
   * Handle a turn timing out.
   */
  function handleTimeout(): void {
    if (match.state !== 'active') {
      return;
    }
    eliminateCurrent('timeout');
    notifyChange();
  }

  /**
   * Start the last-chance mini turn for the current player.
   */
  function startLastChance(): void {
    const halfTime = Math.max(1000, Math.ceil(match.timeLimitMs! / 2));
    match.lastChance = true;
    match.pendingWord = null;
    match.votesByPlayer = new Map();
    startTurn(halfTime);
    notifyChange();
  }

  /**
   * Accept a pending word and move to the next player.
   * @param wordEntry Pending word data.
   */
  function acceptWord(wordEntry: PendingWord): void {
    clearVoteTimer();
    match.usedWordKeys.add(wordEntry.key);
    if (sessionStore) {
      const shared = sessionStore.get<Set<string>>(SHARED_KEY) || new Set();
      shared.add(wordEntry.key.toLowerCase());
      sessionStore.set(SHARED_KEY, shared);
    }
    match.usedWords.push({
      word: wordEntry.word,
      playerId: wordEntry.playerId,
    });
    match.lastOutcome = {
      playerId: wordEntry.playerId,
      word: wordEntry.word,
      outcome: 'accepted',
      lastChance: match.lastChance,
    };
    match.lastChance = false;
    match.pendingWord = null;
    match.votesByPlayer = new Map();
    match.voteEndsAt = null;
    advanceToNextPlayer();
  }

  /**
   * Reject a pending word and handle last chance or elimination.
   * @param wordEntry Pending word data.
   */
  function rejectWord(wordEntry: PendingWord): void {
    clearVoteTimer();
    match.lastOutcome = {
      playerId: wordEntry.playerId,
      word: wordEntry.word,
      outcome: 'rejected',
      lastChance: match.lastChance,
    };
    match.voteEndsAt = null;
    if (match.lastChance) {
      eliminateCurrent('rejected');
    } else {
      startLastChance();
    }
  }

  /**
   * Handle a vote timeout by tallying current votes.
   */
  function handleVoteTimeout(): void {
    if (match.state !== 'voting' || !match.pendingWord) {
      return;
    }
    // When vote times out, count current votes
    // If there's no majority rejection, accept the word
    const eligibleVoters = getEligibleVoters();
    const votes = Array.from(match.votesByPlayer.values());
    const rejectCount = votes.filter((vote) => vote === 'reject').length;
    if (rejectCount > eligibleVoters.length / 2) {
      rejectWord(match.pendingWord);
    } else {
      acceptWord(match.pendingWord);
    }
    notifyChange();
  }

  /**
   * Start a new round if requirements are met.
   * @param durationMs Round duration in milliseconds.
   * @returns Result payload for the start attempt.
   */
  function startRound(durationMs: number): StartRoundResult {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      return { ok: false, reason: 'invalid_duration' };
    }
    if (match.state === 'active' || match.state === 'voting') {
      return { ok: false, reason: 'round_active' };
    }

    const playerIds = playerStore.getPlayerIds();
    if (playerIds.length === 0) {
      return { ok: false, reason: 'no_players' };
    }

    const order = shuffle(playerIds);
    const now = Date.now();
    match = {
      id: match.id + 1,
      state: 'active',
      category: categoryManager.getSelectedCategory(),
      timeLimitMs: durationMs,
      order,
      activePlayerIds: new Set(order),
      eliminatedPlayerIds: new Set(),
      currentIndex: 0,
      currentPlayerId: order[0],
      currentLetter: randomLetter(),
      lastChance: false,
      turnStartedAt: now,
      turnEndsAt: now + durationMs,
      pendingWord: null,
      votesByPlayer: new Map(),
      voteEndsAt: null,
      usedWordKeys: new Set(),
      usedWords: [],
      lastOutcome: null,
      winnerId: null,
    };

    if (markWinnerIfReady()) {
      return { ok: true, matchId: match.id };
    }

    clearTurnTimer();
    turnTimeout = setTimeout(() => {
      handleTimeout();
    }, durationMs);

    notifyChange();
    return { ok: true, matchId: match.id, currentPlayerId: match.currentPlayerId! };
  }

  /**
   * Submit a word for the current turn.
   * @param playerId Player identifier.
   * @param wordInput Raw word input.
   * @returns Result payload for the submission.
   */
  function submitWord(playerId: string, wordInput: string): SubmitWordResult {
    if (match.state !== 'active') {
      return { ok: false, reason: 'round_not_active' };
    }
    if (playerId !== match.currentPlayerId) {
      return { ok: false, reason: 'not_turn' };
    }
    if (!isActivePlayer(playerId)) {
      return { ok: false, reason: 'eliminated' };
    }

    const now = Date.now();
    if (match.turnEndsAt && now > match.turnEndsAt) {
      handleTimeout();
      return { ok: false, reason: 'time_up' };
    }

    const rawWord = (wordInput || '').trim();
    if (!rawWord) {
      return { ok: false, reason: 'empty' };
    }

    const letter = match.currentLetter || '';
    if (rawWord[0].toUpperCase() !== letter.toUpperCase()) {
      return { ok: false, reason: 'invalid_letter' };
    }

    const key = rawWord.toUpperCase();
    if (match.usedWordKeys.has(key)) {
      return { ok: false, reason: 'duplicate' };
    }

    const reuseEnabled = sessionStore?.get<boolean>('shared:reuse-enabled');
    if (reuseEnabled !== false) {
      const shared = sessionStore?.get<Set<string>>(SHARED_KEY);
      if (shared?.has(key.toLowerCase())) {
        return { ok: false, reason: 'used_in_previous_game' };
      }
    }

    match.usedWordKeys.add(key);
    match.pendingWord = {
      word: rawWord,
      key,
      playerId,
    };
    match.state = 'voting';
    match.votesByPlayer = new Map();
    clearTurnTimer();
    clearVoteTimer();

    const eligibleVoters = getEligibleVoters();
    if (eligibleVoters.length === 0) {
      acceptWord(match.pendingWord);
    } else {
      // Start vote timeout - same duration as turn time limit
      const voteTimeLimit = match.timeLimitMs || 5000;
      match.voteEndsAt = Date.now() + voteTimeLimit;
      voteTimeout = setTimeout(() => {
        handleVoteTimeout();
      }, voteTimeLimit);
    }

    notifyChange();
    return { ok: true };
  }

  /**
   * Submit a vote for the pending word.
   * @param playerId Player identifier.
   * @param payload Vote payload or decision string.
   * @returns Result payload for the vote.
   */
  function submitVotes(playerId: string, payload: unknown): SubmitVotesResult {
    if (match.state !== 'voting') {
      return { ok: false, reason: 'not_voting' };
    }
    if (!match.pendingWord) {
      return { ok: false, reason: 'no_word' };
    }
    // All players in the match can vote except the current player who submitted the word
    const isInMatch = match.order.includes(playerId);
    if (!isInMatch || playerId === match.currentPlayerId) {
      return { ok: false, reason: 'not_eligible' };
    }
    if (match.votesByPlayer.has(playerId)) {
      return { ok: false, reason: 'already_voted' };
    }

    const decision = payload && typeof payload === 'object' && 'decision' in payload
      ? (payload as { decision: string }).decision
      : payload;
    if (decision !== 'accept' && decision !== 'reject') {
      return { ok: false, reason: 'invalid_vote' };
    }

    match.votesByPlayer.set(playerId, decision as string);

    const eligibleVoters = getEligibleVoters();
    if (match.votesByPlayer.size >= eligibleVoters.length) {
      const votes = Array.from(match.votesByPlayer.values());
      const rejectCount = votes.filter((vote) => vote === 'reject').length;
      if (rejectCount > eligibleVoters.length / 2) {
        rejectWord(match.pendingWord);
      } else {
        acceptWord(match.pendingWord);
      }
    }

    notifyChange();
    return { ok: true };
  }

  /**
   * Join a player and broadcast updated state.
   * @param payload Player join payload.
   * @returns Result payload from the player store.
   */
  function joinPlayer(payload: { name?: string; playerId?: string }): { ok: boolean; playerId?: string; name?: string; error?: string } {
    const result = playerStore.joinPlayer(payload);
    if (!result.ok) {
      return result;
    }
    notifyChange();
    return result;
  }

  /**
   * Build the public match state payload.
   * @returns State object without game metadata.
   */
  function getState(): Omit<LastWordStandingState, 'game' | 'games'> {
    const votes = Array.from(match.votesByPlayer.values());
    const rejectCount = votes.filter((vote) => vote === 'reject').length;
    const acceptCount = votes.filter((vote) => vote === 'accept').length;
    const eligibleVoters = match.state === 'voting' ? getEligibleVoters() : [];

    return {
      ...buildBaseState(),
      match: {
        id: match.id,
        state: match.state,
        category: match.category,
        timeLimitMs: match.timeLimitMs,
        order: match.order,
        activePlayerIds: Array.from(match.activePlayerIds),
        eliminatedPlayerIds: Array.from(match.eliminatedPlayerIds),
        currentPlayerId: match.currentPlayerId,
        currentLetter: match.currentLetter,
        lastChance: match.lastChance,
        turnStartedAt: match.turnStartedAt,
        turnEndsAt: match.turnEndsAt,
        pendingWord: match.pendingWord
          ? { word: match.pendingWord.word, playerId: match.pendingWord.playerId }
          : null,
        votes: match.state === 'voting'
          ? {
              submittedIds: Array.from(match.votesByPlayer.keys()),
              rejectCount,
              acceptCount,
              totalEligible: eligibleVoters.length,
              voteEndsAt: match.voteEndsAt,
            }
          : null,
        usedWords: match.usedWords.slice(),
        lastOutcome: match.lastOutcome,
        winnerId: match.winnerId,
      },
    };
  }

  /**
   * Get the current match phase.
   * @returns Match state string.
   */
  function getPhase(): string {
    return match.state;
  }

  /**
   * End the current game early, returning to idle state.
   * @returns Result payload for the end game attempt.
   */
  function endGame(): EndGameResult {
    if (match.state === 'idle' || match.state === 'finished') {
      return { ok: false, reason: 'not_active' };
    }

    clearTurnTimer();
    clearVoteTimer();
    match = createEmptyMatch();
    notifyChange();
    return { ok: true };
  }

  return {
    id: 'lastwordstanding',
    name: 'Last Word Standing',
    categories,
    getPhase,
    getState,
    startRound,
    submitWord,
    submitVotes,
    joinPlayer,
    selectCategory: categoryManager.selectCategory,
    selectRandomCategory: categoryManager.selectRandomCategory,
    addCategory: categoryManager.addCategory,
    endGame,
  };
}
