import type {
  DoubleBluffState,
  DoubleBluffSubmission,
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

const USED_WORDS_KEY = 'doublebluff:used-words';
const DEFAULT_WINNING_SCORE = 5;

export interface DoubleBluffGameOptions {
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

export interface DoubleBluffGame {
  id: string;
  name: string;
  getPhase(): string;
  getState(): Omit<DoubleBluffState, 'game' | 'games'>;
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
  cluePhase: 0 | 1 | 2;
  word: string | null;
  undercoverPlayerId: string | null;
  revealedPlayerIds: Set<string>;
  readyPlayerIds: Set<string>;
  firstSubmissions: Map<string, string>;
  secondSubmissions: Map<string, string>;
  displayedClues: Map<string, string>;
  firstClues: string[];
  submittedPlayerIds: Set<string>;
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
    cluePhase: 0,
    word: null,
    undercoverPlayerId: null,
    revealedPlayerIds: new Set(),
    readyPlayerIds: new Set(),
    firstSubmissions: new Map(),
    secondSubmissions: new Map(),
    displayedClues: new Map(),
    firstClues: [],
    submittedPlayerIds: new Set(),
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
 * Create an Undercover Agent: Double Bluff game instance.
 * @param options Game configuration options.
 * @returns Double Bluff game instance.
 */
export function createGame(options: DoubleBluffGameOptions = {}) {
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
   * Whether both clues should be exposed for each player (after the reveal).
   * @returns True when full clue information is public.
   */
  function shouldExposeAllClues(): boolean {
    if (match.state === 'voting' || match.state === 'guessing') {
      return true;
    }
    return match.finishReason !== null && (match.state === 'idle' || match.state === 'finished');
  }

  /**
   * Build the public submissions list from internal state.
   * @returns Array of submissions for each player who has submitted clues.
   */
  function buildPublicSubmissions(): DoubleBluffSubmission[] {
    const includeAll = shouldExposeAllClues();
    const result: DoubleBluffSubmission[] = [];
    for (const pid of match.participants) {
      const first = match.firstSubmissions.get(pid);
      const second = match.secondSubmissions.get(pid);
      const displayed = match.displayedClues.get(pid) ?? null;
      if (!first && !second) continue;
      const clues = includeAll
        ? (pid === match.undercoverPlayerId
            ? (second ? [second] : [])
            : [first, second].filter((w): w is string => Boolean(w)))
        : (displayed ? [displayed] : []);
      result.push({
        playerId: pid,
        playerName: getPlayerName(pid),
        clues,
        displayedClue: displayed,
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
  function getState(): Omit<DoubleBluffState, 'game' | 'games'> {
    return {
      serverTime: Date.now(),
      players: playerStore ? playerStore.listPlayers() : [],
      settings: { categories: [], selectedCategory: '' },
      gameSettings: { winningScore },
      match: {
        id: match.id,
        state: winnerIds.length > 0 ? 'finished' : match.state,
        cluePhase: match.state === 'submitting' ? match.cluePhase : 0,
        word: match.word,
        undercoverPlayerId: match.undercoverPlayerId,
        revealedPlayerIds: [...match.revealedPlayerIds],
        readyPlayerIds: [...match.readyPlayerIds],
        firstClues: match.state === 'submitting' && match.cluePhase === 2 ? [...match.firstClues] : [],
        submissions: buildPublicSubmissions(),
        submittedPlayerIds: [...match.submittedPlayerIds],
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
   * Transition from reveal to the first clue submission wave.
   */
  function transitionToSubmitting(): void {
    match.state = 'submitting';
    match.cluePhase = 1;
    match.submittedPlayerIds = new Set();
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
   * Build the anonymous list of civilian first clues shown to the agent in wave 2.
   */
  function buildAnonymousFirstClues(): void {
    match.firstClues = shuffle(
      match.participants
        .filter(pid => pid !== match.undercoverPlayerId)
        .map(pid => match.firstSubmissions.get(pid)!)
    );
  }

  /**
   * Transition from clue wave 1 to clue wave 2.
   */
  function transitionToWaveTwo(): void {
    match.cluePhase = 2;
    match.submittedPlayerIds = new Set();
    buildAnonymousFirstClues();
    notifyChange();
  }

  /**
   * Pick the displayed clue for each player: a random one of their two clues
   * for civilians, the second clue for the agent. Where possible, orientations
   * are adjusted to avoid presenting the same word more than once.
   */
  function buildDisplayedClues(): void {
    const displayed = chooseDisplayedOrientations();
    for (const pid of match.participants) {
      match.displayedClues.set(pid, displayed.get(pid)!);
    }
  }

  /**
   * Choose which clue to display for each player, minimizing duplicate words
   * shown at voting time. The agent's second clue is always displayed, so it is
   * included when counting duplicate words; a civilian whose displayed clue
   * would repeat another is flipped to their other clue. Among equally-optimal
   * orientations, the one closest to the random baseline (fewest civilians
   * flipped) is preferred.
   * @returns Map of player to displayed clue.
   */
  function chooseDisplayedOrientations(): Map<string, string> {
    const civilians: Array<{ pid: string; first: string; second: string }> = [];
    const base = new Map<string, string>();
    for (const pid of match.participants) {
      if (pid === match.undercoverPlayerId) {
        base.set(pid, match.secondSubmissions.get(pid)!);
      } else {
        const first = match.firstSubmissions.get(pid)!;
        const second = match.secondSubmissions.get(pid)!;
        base.set(pid, pickRandom([first, second]) === first ? first : second);
        civilians.push({ pid, first, second });
      }
    }

    const masks = Array.from({ length: 1 << civilians.length }, (_, mask) => mask)
      .sort((a, b) => countSetBits(a) - countSetBits(b));

    const baseScore = countDuplicateWords(base);
    if (baseScore === 0) {
      return base;
    }

    let best = base;
    let bestScore = baseScore;
    let bestFlips = 0;
    for (const mask of masks) {
      const flips = countSetBits(mask);
      const candidate = new Map(base);
      for (let i = 0; i < civilians.length; i++) {
        if (((mask >> i) & 1) === 1) {
          const civ = civilians[i];
          const current = candidate.get(civ.pid)!;
          candidate.set(civ.pid, current === civ.first ? civ.second : civ.first);
        }
      }
      const score = countDuplicateWords(candidate);
      if (score < bestScore || (score === bestScore && flips < bestFlips)) {
        bestScore = score;
        bestFlips = flips;
        best = candidate;
        if (score === 0) {
          break;
        }
      }
    }
    return best;
  }

  /**
   * Count the number of set bits in a non-negative integer.
   * @param value Integer to inspect.
   * @returns Number of set bits.
   */
  function countSetBits(value: number): number {
    let count = 0;
    for (let n = value; n > 0; n &= n - 1) {
      count += 1;
    }
    return count;
  }

  /**
   * Count how many duplicate words occur across the displayed clues.
   * @param displayed Map of player to displayed clue.
   * @returns Number of extra occurrences beyond the first per word.
   */
  function countDuplicateWords(displayed: Map<string, string>): number {
    const seen = new Set<string>();
    let duplicates = 0;
    for (const word of displayed.values()) {
      const normalized = normalizeWord(word);
      if (seen.has(normalized)) {
        duplicates += 1;
      } else {
        seen.add(normalized);
      }
    }
    return duplicates;
  }

  /**
   * Handle a clue submission during either wave of the submitting phase.
   * @param playerId Player identifier.
   * @param wordInput The clue being submitted.
   * @returns Submission result.
   */
  function handleSubmittingPhase(playerId: string, wordInput: string): SubmitWordResult {
    if (!match.participants.includes(playerId)) {
      return { ok: false, reason: 'not_participant' };
    }
    if (match.submittedPlayerIds.has(playerId)) {
      return { ok: false, reason: 'already_submitted' };
    }

    const trimmed = wordInput.trim();
    if (!trimmed) {
      return { ok: false, reason: 'empty' };
    }

    if (match.cluePhase === 1) {
      const isSecretWord = match.word !== null
        && normalizeWord(trimmed) === normalizeWord(match.word);
      if (isSecretWord) {
        finishOnSecretWord(playerId);
        notifyChange();
        return { ok: true };
      }
      match.firstSubmissions.set(playerId, trimmed);
      match.submittedPlayerIds.add(playerId);
      if (match.submittedPlayerIds.size >= match.participants.length) {
        transitionToWaveTwo();
      } else {
        notifyChange();
      }
      return { ok: true };
    }

    const normalized = normalizeWord(trimmed);
    const isSecretWord = match.word !== null
      && normalized === normalizeWord(match.word);

    if (!isSecretWord && isDuplicateOfOwnFirst(normalized, playerId)) {
      return { ok: false, reason: 'duplicate_first_clue' };
    }
    if (!isSecretWord
      && playerId === match.undercoverPlayerId
      && isDuplicateOfShownFirstClue(normalized)
    ) {
      return { ok: false, reason: 'duplicate_first_clue' };
    }

    match.secondSubmissions.set(playerId, trimmed);
    match.submittedPlayerIds.add(playerId);

    if (isSecretWord) {
      finishOnSecretWord(playerId);
      notifyChange();
      return { ok: true };
    }

    if (match.secondSubmissions.size >= match.participants.length) {
      buildDisplayedClues();
      transitionToVoting();
    } else {
      notifyChange();
    }
    return { ok: true };
  }

  /**
   * Check whether a player's wave-2 word repeats the word they submitted in wave 1.
   * @param word Normalized word to check.
   * @param playerId Submitter to check.
   * @returns True if the word matches the player's own wave-1 clue.
   */
  function isDuplicateOfOwnFirst(word: string, playerId: string): boolean {
    const ownFirst = match.firstSubmissions.get(playerId);
    return ownFirst !== undefined && normalizeWord(ownFirst) === word;
  }

  /**
   * Check whether the agent's wave-2 word repeats one of the anonymous civilian
   * first clues presented to them before wave 2.
   * @param word Normalized word to check.
   * @returns True if the word matches any presented first clue.
   */
  function isDuplicateOfShownFirstClue(word: string): boolean {
    return match.firstClues.some(clue => normalizeWord(clue) === word);
  }

  /**
   * Transition from submitting to voting phase.
   */
  function transitionToVoting(): void {
    match.state = 'voting';
    match.cluePhase = 0;
    match.firstClues = [];
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
   * @param _durationMs Unused (rounds are fixed at one clue pair per word).
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
    id: 'doublebluff',
    name: 'Undercover Agent: Double Bluff',
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
