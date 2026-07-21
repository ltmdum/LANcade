import {
  categories,
  type AlphabetRaceState,
  type AlphabetRaceMatchState,
} from '@lancade/shared';
import { createGameBase } from '../shared/stores/game-base.js';
import { PlayerStore } from '../shared/stores/player-store.js';

export interface AlphabetRaceGameOptions {
  onStateChange?: () => void;
  playerStore?: PlayerStore;
}

export interface StartRoundResult {
  ok: boolean;
  matchId?: number;
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

export interface HandleActionResult {
  ok: boolean;
  reason?: string;
}

export interface AlphabetRaceGame {
  id: string;
  name: string;
  categories: string[];
  getPhase(): string;
  getState(): Omit<AlphabetRaceState, 'game' | 'games'>;
  startRound(durationMs: number): StartRoundResult;
  submitWord(playerId: string, wordInput: string): SubmitWordResult;
  submitVotes(playerId: string, payload: unknown): SubmitVotesResult;
  handleAction(playerId: string, action: unknown): HandleActionResult;
  joinPlayer(payload: { name?: string; playerId?: string }): { ok: boolean; playerId?: string; name?: string; error?: string };
  selectCategory(category: string): { ok: boolean; category?: string; reason?: string };
  selectRandomCategory(): { ok: boolean; category?: string; reason?: string };
  addCategory(name: string): { ok: boolean; category?: string; reason?: string };
  endGame(): EndGameResult;
}

interface Match {
  id: number;
  state: 'idle' | 'racing' | 'voting' | 'finished';
  category: string | null;
  letterSequence: string[];
  currentLetterIndex: number;
  voteTimeoutMs: number;
  submittedWord: string | null;
  submittedBy: string | null;
  votesByPlayer: Map<string, string>;
  voteEndsAt: number | null;
  scores: Record<string, number>;
  penalties: Map<string, number>;
  participants: string[];
  completedCount: number;
  winnerIds: string[];
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Generate a random permutation of the 26 uppercase letters (Fisher-Yates shuffle).
 * @returns Shuffled array of all 26 uppercase letters.
 */
function generateLetterSequence(): string[] {
  const sequence = ALPHABET.slice();
  for (let i = sequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
  }
  return sequence;
}

/**
 * Create an empty match state with default values.
 * @returns Empty match object.
 */
function createEmptyMatch(): Match {
  return {
    id: 0,
    state: 'idle',
    category: null,
    letterSequence: [],
    currentLetterIndex: 0,
    voteTimeoutMs: 10000,
    submittedWord: null,
    submittedBy: null,
    votesByPlayer: new Map(),
    voteEndsAt: null,
    scores: {},
    penalties: new Map(),
    participants: [],
    completedCount: 0,
    winnerIds: [],
  };
}

/**
 * Create an Alphabet Race game instance.
 * @param options Optional configuration overrides.
 * @returns AlphabetRaceGame instance.
 */
export function createGame(options: AlphabetRaceGameOptions = {}): AlphabetRaceGame {
  const onStateChange = options.onStateChange || (() => {});
  let match = createEmptyMatch();
  let voteTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Notify listeners that state has changed.
   */
  function notifyChange(): void {
    onStateChange();
  }

  const { playerStore, categoryManager, buildBaseState } = createGameBase({
    categories,
    onChange: notifyChange,
    canChange: () => match.state !== 'racing' && match.state !== 'voting',
    playerStore: options.playerStore,
  });

  /**
   * Clear any active vote timeout.
   */
  function clearVoteTimer(): void {
    if (voteTimer) {
      clearTimeout(voteTimer);
      voteTimer = null;
    }
  }

  /**
   * Get the current letter from the sequence.
   * @returns Current uppercase letter, or null if no sequence.
   */
  function getCurrentLetter(): string | null {
    if (match.letterSequence.length === 0) return null;
    return match.letterSequence[match.currentLetterIndex];
  }

  /**
   * Get the list of player IDs eligible to submit for the current letter.
   * @returns Array of eligible player IDs.
   */
  function getEligibleSubmitters(): string[] {
    return match.participants.filter((id) => {
      const penalty = match.penalties.get(id) || 0;
      return penalty <= 0;
    });
  }

  /**
   * Get the list of player IDs eligible to vote on the current submission.
   * Eligible voters are all participants except the submitter and ineligible players.
   * @returns Array of voter player IDs.
   */
  function getEligibleVoters(): string[] {
    return match.participants.filter((id) => {
      if (id === match.submittedBy) return false;
      const penalty = match.penalties.get(id) || 0;
      return penalty <= 0;
    });
  }

  /**
   * Check if all but one player are ineligible; if so, wipe all penalties.
   * This ensures the game can always proceed.
   */
  function checkAndResetPenalties(): void {
    const eligible = getEligibleSubmitters();
    if (eligible.length <= 1 && match.participants.length > 1) {
      match.penalties.clear();
    }
  }

  /**
   * Decrement all active penalties by one (called when advancing to next letter).
   */
  function decrementPenalties(): void {
    for (const [playerId, remaining] of match.penalties) {
      if (remaining <= 1) {
        match.penalties.delete(playerId);
      } else {
        match.penalties.set(playerId, remaining - 1);
      }
    }
  }

  /**
   * Advance to the next letter in the sequence, or finish the game if all 26 are done.
   */
  function advanceToNextLetter(): void {
    match.completedCount += 1;
    if (match.completedCount >= 26) {
      finishGame();
      return;
    }
    match.currentLetterIndex = (match.currentLetterIndex + 1) % 26;
    decrementPenalties();
    resetLetterState();
    checkAndResetPenalties();
    notifyChange();
  }

  /**
   * Reset submission and voting state for a new letter racing phase.
   */
  function resetLetterState(): void {
    match.state = 'racing';
    match.submittedWord = null;
    match.submittedBy = null;
    match.votesByPlayer = new Map();
    match.voteEndsAt = null;
    clearVoteTimer();
  }

  /**
   * Determine the winner based on scores and set match to finished state.
   * If multiple players share the highest score, all are winners (tie).
   */
  function finishGame(): void {
    match.state = 'finished';
    match.submittedWord = null;
    match.submittedBy = null;
    match.votesByPlayer = new Map();
    match.voteEndsAt = null;
    clearVoteTimer();
    match.winnerIds = determineWinners();
    notifyChange();
  }

  /**
   * Determine the players with the highest score.
   * If multiple players share the highest score, it's a tie.
   * @returns Array of winning player IDs.
   */
  function determineWinners(): string[] {
    let bestScore = -1;
    for (const id of match.participants) {
      const score = match.scores[id] || 0;
      if (score > bestScore) {
        bestScore = score;
      }
    }
    if (bestScore < 0) return [];
    return match.participants.filter((id) => (match.scores[id] || 0) === bestScore);
  }

  /**
   * Accept the current submitted word: score a point, advance to next letter.
   */
  function acceptWord(): void {
    clearVoteTimer();
    if (match.submittedBy) {
      match.scores[match.submittedBy] = (match.scores[match.submittedBy] || 0) + 1;
    }
    match.voteEndsAt = null;
    advanceToNextLetter();
  }

  /**
   * Reject the current submitted word: apply penalty to submitter, resume racing.
   */
  function rejectWord(): void {
    clearVoteTimer();
    if (match.submittedBy) {
      match.penalties.set(match.submittedBy, 2);
    }
    match.voteEndsAt = null;
    match.submittedWord = null;
    match.submittedBy = null;
    match.votesByPlayer = new Map();
    match.state = 'racing';
    checkAndResetPenalties();
    notifyChange();
  }

  /**
   * Resolve the vote by tallying accepts and rejects.
   * If >=50% of eligible voters reject, the word is rejected; otherwise accepted.
   */
  function resolveVote(): void {
    if (match.state !== 'voting' || !match.submittedWord) return;
    const eligibleVoters = getEligibleVoters();
    const votes = Array.from(match.votesByPlayer.values());
    const rejectCount = votes.filter((v) => v === 'reject').length;
    if (rejectCount >= eligibleVoters.length / 2) {
      rejectWord();
    } else {
      acceptWord();
    }
  }

  /**
   * Handle the vote timeout by auto-resolving with current tallies.
   */
  function handleVoteTimeout(): void {
    if (match.state !== 'voting' || !match.submittedWord) return;
    resolveVote();
  }

  /**
   * Start the voting timer for the current submission.
   */
  function startVoteTimer(): void {
    clearVoteTimer();
    const now = Date.now();
    match.voteEndsAt = now + match.voteTimeoutMs;
    voteTimer = setTimeout(() => {
      handleVoteTimeout();
    }, match.voteTimeoutMs);
  }

  /**
   * Start a new round if requirements are met.
   * @param durationMs Voting timeout duration in milliseconds.
   * @returns Result payload for the start attempt.
   */
  function startRound(durationMs: number): StartRoundResult {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      return { ok: false, reason: 'invalid_duration' };
    }
    if (match.state === 'racing' || match.state === 'voting') {
      return { ok: false, reason: 'round_active' };
    }
    const playerIds = playerStore.getPlayerIds();
    if (playerIds.length === 0) {
      return { ok: false, reason: 'no_players' };
    }

    const scores: Record<string, number> = {};
    for (const id of playerIds) {
      scores[id] = 0;
    }

    match = {
      id: match.id + 1,
      state: 'racing',
      category: categoryManager.getSelectedCategory(),
      letterSequence: generateLetterSequence(),
      currentLetterIndex: 0,
      voteTimeoutMs: durationMs,
      submittedWord: null,
      submittedBy: null,
      votesByPlayer: new Map(),
      voteEndsAt: null,
      scores,
      penalties: new Map(),
      participants: playerIds,
      completedCount: 0,
      winnerIds: [],
    };

    notifyChange();
    return { ok: true, matchId: match.id };
  }

  /**
   * Submit a word for the current letter during the racing phase.
   * @param playerId Player identifier.
   * @param wordInput Raw word input.
   * @returns Result payload for the submission.
   */
  function submitWord(playerId: string, wordInput: string): SubmitWordResult {
    if (match.state !== 'racing') {
      return { ok: false, reason: 'not_racing' };
    }
    if (!match.participants.includes(playerId)) {
      return { ok: false, reason: 'not_participant' };
    }
    const penalty = match.penalties.get(playerId) || 0;
    if (penalty > 0) {
      return { ok: false, reason: 'ineligible' };
    }

    const rawWord = (wordInput || '').trim();
    if (!rawWord) {
      return { ok: false, reason: 'empty' };
    }

    const currentLetter = getCurrentLetter();
    if (!currentLetter) {
      return { ok: false, reason: 'no_letter' };
    }
    if (rawWord[0].toUpperCase() !== currentLetter.toUpperCase()) {
      return { ok: false, reason: 'invalid_letter' };
    }

    match.submittedWord = rawWord;
    match.submittedBy = playerId;
    match.state = 'voting';
    match.votesByPlayer = new Map();

    const eligibleVoters = getEligibleVoters();
    if (eligibleVoters.length === 0) {
      acceptWord();
    } else {
      startVoteTimer();
    }

    notifyChange();
    return { ok: true };
  }

  /**
   * Submit a vote for the pending word submission.
   * @param playerId Player identifier.
   * @param payload Vote payload containing decision.
   * @returns Result payload for the vote.
   */
  function submitVotes(playerId: string, payload: unknown): SubmitVotesResult {
    if (match.state !== 'voting') {
      return { ok: false, reason: 'not_voting' };
    }
    if (!match.submittedWord) {
      return { ok: false, reason: 'no_word' };
    }
    const eligible = getEligibleVoters();
    if (!eligible.includes(playerId)) {
      return { ok: false, reason: 'not_eligible' };
    }
    if (match.votesByPlayer.has(playerId)) {
      return { ok: false, reason: 'already_voted' };
    }

    const decision = extractDecision(payload);
    if (decision !== 'accept' && decision !== 'reject') {
      return { ok: false, reason: 'invalid_vote' };
    }

    match.votesByPlayer.set(playerId, decision);

    const eligibleVoters = getEligibleVoters();
    if (match.votesByPlayer.size >= eligibleVoters.length) {
      resolveVote();
    }

    notifyChange();
    return { ok: true };
  }

  /**
   * Extract the decision string from a vote payload.
   * @param payload Raw payload from the client.
   * @returns Decision string or undefined.
   */
  function extractDecision(payload: unknown): string | undefined {
    if (payload && typeof payload === 'object' && 'decision' in payload) {
      return (payload as { decision: string }).decision;
    }
    if (typeof payload === 'string') {
      return payload;
    }
    return undefined;
  }

  /**
   * Join a player and broadcast updated state.
   * @param payload Player join payload.
   * @returns Result payload from the player store.
   */
  function joinPlayer(payload: { name?: string; playerId?: string }): { ok: boolean; playerId?: string; name?: string; error?: string } {
    const result = playerStore.joinPlayer(payload);
    if (!result.ok) return result;
    notifyChange();
    return result;
  }

  /**
   * Get the current match phase.
   * @returns Match state string.
   */
  function getPhase(): string {
    return match.state;
  }

  /**
   * Build the list of currently ineligible player IDs.
   * @returns Array of player IDs with active penalties.
   */
  function getIneligiblePlayerIds(): string[] {
    return match.participants.filter((id) => (match.penalties.get(id) || 0) > 0);
  }

  /**
   * Build the public match state payload for clients.
   * @returns State object without game metadata.
   */
  function getState(): Omit<AlphabetRaceState, 'game' | 'games'> {
    const votes = Array.from(match.votesByPlayer.values());
    const rejectCount = votes.filter((v) => v === 'reject').length;
    const acceptCount = votes.filter((v) => v === 'accept').length;
    const eligibleVoters = match.state === 'voting' ? getEligibleVoters() : [];
    const submitterName = match.submittedBy
      ? playerStore.getPlayerName(match.submittedBy)
      : null;
    const winnerNames = match.winnerIds
      ? match.winnerIds.map((id) => playerStore.getPlayerName(id))
      : [];

    return {
      ...buildBaseState(),
      match: {
        id: match.id,
        state: match.state,
        category: match.category,
        letterSequence: match.letterSequence,
        currentLetterIndex: match.currentLetterIndex,
        currentLetter: getCurrentLetter(),
        submittedWord: match.submittedWord,
        submittedBy: match.submittedBy,
        submittedByName: submitterName,
        voteTimeoutMs: match.voteTimeoutMs,
        voteEndsAt: match.voteEndsAt,
        votesAccept: acceptCount,
        votesReject: rejectCount,
        votedPlayerIds: Array.from(match.votesByPlayer.keys()),
        eligibleVoterCount: eligibleVoters.length,
        scores: { ...match.scores },
        ineligiblePlayerIds: getIneligiblePlayerIds(),
        completedCount: match.completedCount,
        participants: match.participants.slice(),
        winnerIds: match.winnerIds,
        winnerNames,
      },
    };
  }

  /**
   * Handle a game-specific action.
   * Supports 'skipLetter' to advance to the next letter without scoring (admin-only in UI).
   * @param _playerId Player identifier (unused for skip).
   * @param action Action payload.
   * @returns Result payload.
   */
  function handleAction(_playerId: string, action: unknown): HandleActionResult {
    if (!action || typeof action !== 'object') {
      return { ok: false, reason: 'invalid_action' };
    }
    const { type } = action as { type?: string };
    if (type === 'skipLetter') {
      if (match.state !== 'racing' && match.state !== 'voting') {
        return { ok: false, reason: 'not_active' };
      }
      clearVoteTimer();
      match.submittedWord = null;
      match.submittedBy = null;
      match.votesByPlayer = new Map();
      match.voteEndsAt = null;
      advanceToNextLetter();
      return { ok: true };
    }
    return { ok: false, reason: 'unknown_action' };
  }

  /**
   * End the current game early, returning to idle state.
   * @returns Result payload for the end game attempt.
   */
  function endGame(): EndGameResult {
    if (match.state === 'idle' || match.state === 'finished') {
      return { ok: false, reason: 'not_active' };
    }
    clearVoteTimer();
    match = createEmptyMatch();
    notifyChange();
    return { ok: true };
  }

  return {
    id: 'alphabetrace',
    name: 'Alphabet Race',
    categories,
    getPhase,
    getState,
    startRound,
    submitWord,
    submitVotes,
    handleAction,
    joinPlayer,
    selectCategory: categoryManager.selectCategory,
    selectRandomCategory: categoryManager.selectRandomCategory,
    addCategory: categoryManager.addCategory,
    endGame,
  };
}
