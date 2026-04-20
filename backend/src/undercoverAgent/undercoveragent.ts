import type {
  UndercoverAgentState,
  UndercoverAgentMatchState,
  UndercoverSubmission,
  UndercoverVoteTally,
  UndercoverVoteRound,
} from '@lancade/shared';
import { PlayerStore } from '../shared/stores/player-store.js';
import { normalizeWord } from '../shared/utils/normalize-word.js';
import wordListData from '../shared/data/common-words.json' with { type: 'json' };

const wordList = wordListData as string[];

export interface UndercoverAgentGameOptions {
  onStateChange?: () => void;
  playerStore?: PlayerStore;
}

export interface StartRoundResult {
  ok: boolean;
  roundId?: number;
  reason?: string;
}

export interface SubmitWordResult {
  ok: boolean;
  reason?: string;
  role?: 'undercover' | 'civilian';
}

export interface SubmitVotesResult {
  ok: boolean;
  reason?: string;
}

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
}

interface Match {
  id: number;
  state: 'idle' | 'reveal' | 'submitting' | 'voting' | 'guessing' | 'finished';
  word: string | null;
  undercoverPlayerId: string | null;
  revealedPlayerIds: Set<string>;
  readyPlayerIds: Set<string>;
  totalRounds: number;
  currentRound: number;
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
    totalRounds: 2,
    currentRound: 1,
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
 * Select a random word from the word list, avoiding previously used words.
 * @param usedWords Set of words already used this game.
 * @returns A randomly selected word.
 */
function selectRandomWord(usedWords: Set<string>): string {
  const available = wordList.filter(w => !usedWords.has(w));
  const pool = available.length > 0 ? available : wordList;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Shuffle an array using the Fisher-Yates algorithm.
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
 * Pick a random element from an array.
 * @param array Input array.
 * @returns A random element.
 */
function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Create an Undercover Agent game instance.
 * @param options Game configuration options.
 * @returns Undercover Agent game instance.
 */
export function createGame(options: UndercoverAgentGameOptions = {}) {
  const onStateChange = options.onStateChange || (() => {});
  const playerStore = options.playerStore;

  let match = createEmptyMatch();
  let totalRoundsSetting = 2;

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
   * @returns Array of submissions showing each player's words across rounds.
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
      gameSettings: { totalRounds: totalRoundsSetting },
      match: {
        id: match.id,
        state: match.state,
        word: match.state === 'guessing' ? null : match.word,
        undercoverPlayerId: (match.state === 'finished' || match.state === 'guessing') ? match.undercoverPlayerId : null,
        revealedPlayerIds: [...match.revealedPlayerIds],
        readyPlayerIds: [...match.readyPlayerIds],
        totalRounds: match.totalRounds,
        currentRound: match.currentRound,
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
      },
    };
  }

  /**
   * Initialize the reveal phase by picking a word and undercover agent.
   * @param participants Array of player IDs participating.
   */
  function initRevealPhase(participants: string[]): void {
    match.word = selectRandomWord(match.usedWords);
    match.undercoverPlayerId = pickRandom(participants);
    match.revealedPlayerIds = new Set();
    match.readyPlayerIds = new Set();
  }

  /**
   * Transition from reveal to submitting phase.
   * Sets up turn order starting at a random player.
   */
  function transitionToSubmitting(): void {
    match.state = 'submitting';
    match.turnOrder = shuffle(match.participants);
    match.currentTurnIndex = 0;
    match.currentTurnPlayerId = match.turnOrder[0];
    match.currentRound = 1;
    match.roundSubmittedPlayerIds = new Set();
    if (match.word) {
      match.usedWords.add(match.word);
    }
    notifyChange();
  }

  /**
   * Check if all players have readied. If so, transition to submitting.
   */
  function checkRevealComplete(): void {
    const allReady = match.participants.every(pid => match.readyPlayerIds.has(pid));
    if (allReady) {
      transitionToSubmitting();
    }
  }

  /**
   * Handle the REVEAL action during reveal phase.
   * @param playerId Player identifier.
   * @returns Result with the player's role.
   */
  function handleReveal(playerId: string): SubmitWordResult {
    if (match.revealedPlayerIds.has(playerId)) {
      return { ok: false, reason: 'already_revealed' };
    }
    match.revealedPlayerIds.add(playerId);
    const isUndercover = playerId === match.undercoverPlayerId;
    notifyChange();
    return { ok: true, role: isUndercover ? 'undercover' : 'civilian' };
  }

  /**
   * Handle the READY action during reveal phase.
   * @param playerId Player identifier.
   * @returns Result of the ready action.
   */
  function handleReady(playerId: string): SubmitWordResult {
    if (!match.revealedPlayerIds.has(playerId)) {
      return { ok: false, reason: 'must_reveal_first' };
    }
    if (match.readyPlayerIds.has(playerId)) {
      return { ok: false, reason: 'already_acted' };
    }
    match.readyPlayerIds.add(playerId);
    checkRevealComplete();
    if (match.state === 'reveal') {
      notifyChange();
    }
    return { ok: true };
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
   * Advance to the next turn or next round in the submitting phase.
   */
  function advanceTurn(): void {
    if (match.roundSubmittedPlayerIds.size >= match.participants.length) {
      if (match.currentRound >= match.totalRounds) {
        transitionToVoting();
        return;
      }
      match.currentRound += 1;
      match.roundSubmittedPlayerIds = new Set();
      match.currentTurnIndex = 0;
      match.currentTurnPlayerId = match.turnOrder[0];
      notifyChange();
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
      match.state = 'finished';
      match.winnerIsUndercover = true;
      match.finishReason = playerId === match.undercoverPlayerId
        ? 'agent_found_word'
        : 'civilian_revealed_word';
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
    notifyChange();
  }

  /**
   * Build a vote tally from the current votes.
   * @returns Array of tally entries sorted by count descending.
   */
  function buildVoteTally(): UndercoverVoteTally[] {
    const counts = new Map<string, number>();
    for (const pid of match.participants) {
      counts.set(pid, 0);
    }
    for (const targetId of match.currentVotes.values()) {
      counts.set(targetId, (counts.get(targetId) || 0) + 1);
    }

    const tally: UndercoverVoteTally[] = [];
    for (const [playerId, count] of counts.entries()) {
      tally.push({
        playerId,
        playerName: getPlayerName(playerId),
        count,
      });
    }
    tally.sort((a, b) => b.count - a.count);
    return tally;
  }

  /**
   * Check if the vote is unanimous (all players except the target voted for the same player).
   * @param tally The current vote tally.
   * @returns Object with unanimity status and target ID if unanimous.
   */
  function checkUnanimous(tally: UndercoverVoteTally[]): { isUnanimous: boolean; targetId: string | null } {
    for (const entry of tally) {
      const otherVoterCount = match.participants.length - 1;
      const votesFromOthers = countVotesExcluding(entry.playerId);
      if (votesFromOthers === otherVoterCount) {
        return { isUnanimous: true, targetId: entry.playerId };
      }
    }
    return { isUnanimous: false, targetId: null };
  }

  /**
   * Count how many players (excluding the target) voted for the target.
   * @param targetId The player being counted against.
   * @returns Number of votes from other players.
   */
  function countVotesExcluding(targetId: string): number {
    let count = 0;
    for (const [voterId, votedFor] of match.currentVotes.entries()) {
      if (voterId !== targetId && votedFor === targetId) {
        count += 1;
      }
    }
    return count;
  }

  /**
   * Process the vote results when all players have voted.
   */
  function processVoteResults(): void {
    const tally = buildVoteTally();
    const { isUnanimous, targetId } = checkUnanimous(tally);

    const voteRound: UndercoverVoteRound = {
      tally,
      votedPlayerIds: [...match.votedPlayerIds],
      isUnanimous,
      unanimousTargetId: targetId,
    };
    match.voteRounds.push(voteRound);

    if (isUnanimous) {
      resolveUnanimousVote(targetId!);
    } else {
      startNewVoteRound();
    }
  }

  /**
   * Resolve a unanimous vote. If the target is the undercover agent, transition
   * to guessing so the agent gets a final chance to guess the word. Otherwise
   * the agent wins immediately because civilians voted for the wrong player.
   * @param unanimousTargetId The player who received the unanimous vote.
   */
  function resolveUnanimousVote(unanimousTargetId: string): void {
    if (unanimousTargetId === match.undercoverPlayerId) {
      match.state = 'guessing';
    } else {
      match.state = 'finished';
      match.winnerIsUndercover = true;
      match.finishReason = 'wrong_vote';
    }
    notifyChange();
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

    if (match.word && normalizeWord(trimmed) === normalizeWord(match.word)) {
      match.state = 'finished';
      match.winnerIsUndercover = true;
      match.finishReason = 'agent_final_guess_correct';
    } else {
      match.state = 'finished';
      match.winnerIsUndercover = false;
      match.finishReason = 'agent_final_guess_wrong';
    }

    notifyChange();
    return { ok: true };
  }

  /**
   * Start a new vote round after a non-unanimous result.
   */
  function startNewVoteRound(): void {
    match.currentVoteRound += 1;
    match.votedPlayerIds = new Set();
    match.currentVotes = new Map();
    notifyChange();
  }

  /**
   * Start a new round with the configured number of submission rounds.
   * @param _durationMs Unused (rounds configured via updateSettings).
   * @returns Start result.
   */
  function startRound(_durationMs: number): StartRoundResult {
    const playerIds = getPlayerIds();
    if (playerIds.length < 3) {
      return { ok: false, reason: 'need_3_players' };
    }

    const totalRounds = totalRoundsSetting;
    const participants = [...playerIds];

    match = createEmptyMatch();
    match.id += 1;
    match.state = 'reveal';
    match.totalRounds = totalRounds;
    match.participants = participants;

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
   * @param playerId Voter player ID.
   * @param payload Vote payload containing targetPlayerId.
   * @returns Vote result.
   */
  function submitVotes(playerId: string, payload: unknown): SubmitVotesResult {
    if (match.state !== 'voting') {
      return { ok: false, reason: 'not_voting' };
    }
    if (!match.participants.includes(playerId)) {
      return { ok: false, reason: 'not_participant' };
    }
    if (match.votedPlayerIds.has(playerId)) {
      return { ok: false, reason: 'already_voted' };
    }

    const targetPlayerId = extractTargetPlayerId(payload);
    if (!targetPlayerId) {
      return { ok: false, reason: 'invalid_vote' };
    }
    if (!match.participants.includes(targetPlayerId)) {
      return { ok: false, reason: 'invalid_target' };
    }

    match.votedPlayerIds.add(playerId);
    match.currentVotes.set(playerId, targetPlayerId);

    if (match.votedPlayerIds.size >= match.participants.length) {
      processVoteResults();
    } else {
      notifyChange();
    }

    return { ok: true };
  }

  /**
   * Extract the target player ID from a vote payload.
   * @param payload Raw vote payload.
   * @returns Target player ID or null if invalid.
   */
  function extractTargetPlayerId(payload: unknown): string | null {
    if (payload && typeof payload === 'object' && 'targetPlayerId' in payload) {
      const target = (payload as { targetPlayerId: unknown }).targetPlayerId;
      if (typeof target === 'string' && target.length > 0) {
        return target;
      }
    }
    return null;
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
      notifyChange();
    }
    return result;
  }

  /**
   * Update admin-configurable settings (only when idle).
   * @param settings Key-value settings to update.
   * @returns Update result.
   */
  function updateSettings(settings: Record<string, unknown>): { ok: boolean; reason?: string } {
    if (match.state !== 'idle') return { ok: false, reason: 'game_active' };
    if ('totalRounds' in settings) {
      const val = settings.totalRounds;
      if (typeof val === 'number' && Number.isInteger(val) && val >= 1 && val <= 10) {
        totalRoundsSetting = val;
        notifyChange();
        return { ok: true };
      }
      return { ok: false, reason: 'invalid_value' };
    }
    return { ok: false, reason: 'unknown_setting' };
  }

  /**
   * End the current game, returning to idle state.
   * @returns End result.
   */
  function endGame(): EndGameResult {
    if (match.state === 'idle') {
      return { ok: false, reason: 'not_active' };
    }
    match = createEmptyMatch();
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
