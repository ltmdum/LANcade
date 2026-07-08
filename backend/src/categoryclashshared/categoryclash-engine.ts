import crypto from 'crypto';
import type {
  CategoryClashState,
  CategoryClashRoundState,
  WordsByPlayerEntry,
  PlayerResult,
  PlayerInfo,
  CategorySettings,
} from '@lancade/shared';
import { createGameBase } from '../shared/stores/game-base.js';
import { randomLetter } from '../shared/utils/letters.js';
import { PlayerStore } from '../shared/stores/player-store.js';
import { CategoryManager } from '../shared/stores/category-manager.js';
import { MultiCategoryManager } from './stores/multi-category-manager.js';

type AnyCategoryManager = CategoryManager | MultiCategoryManager;

export interface CategoryClashEngineOptions {
  categories?: string[];
  onStateChange?: () => void;
  clientGraceMs?: number;
  playerStore?: PlayerStore;
  createCategoryManager: (config: {
    categories?: string[];
    onChange?: () => void;
    canChange?: () => boolean;
  }) => AnyCategoryManager;
  /**
   * Produce the per-round prompt data. Defaults to a single random letter.
   * Games such as Nine Dash override this to generate a tray of letter tiles.
   */
  generateRoundData?: () => RoundData;
  /**
   * Validate a submitted word against the active round's prompt. Returns an
   * error result to reject the word, or null to accept. Defaults to the
   * Category Clash rule that the word must start with the round's letter.
   */
  validateActiveWord?: (round: Round, key: string, rawWord: string) => SubmitWordResult | null;
  /**
   * Score a single accepted word. Defaults to one point per word; Nine Dash
   * overrides this to award points equal to the word length.
   */
  scoreWord?: (word: WordEntry) => number;
  /**
   * When true the game has no categories: rounds carry no category and words
   * are stored without one. Defaults to false (category-based games).
   */
  categoryless?: boolean;
}

/** Per-round prompt data produced by {@link CategoryClashEngineOptions.generateRoundData}. */
export interface RoundData {
  letter: string | null;
  letters?: string[] | null;
}

export interface WordEntry {
  id: string;
  word: string;
  key: string;
  playerId: string;
  category: string;
  downvotedBy: Set<string>;
  votedOut: boolean;
  downvoterNames: string[];
}

export interface Submission {
  word: string;
  category: string | null;
  status: string;
  wordId?: string;
  blockedByPlayerId?: string;
}

export interface Round {
  id: number;
  state: 'idle' | 'active' | 'voting' | 'results';
  letter: string | null;
  letters: string[] | null;
  category: string | null;
  categories: string[];
  durationMs: number | null;
  startedAt: number | null;
  endsAt: number | null;
  finishDeadline: number | null;
  participants: string[];
  acceptedWords: WordEntry[];
  acceptedWordByKey: Map<string, WordEntry>;
  acceptedWordById: Map<string, WordEntry>;
  acceptedByPlayerCategory: Map<string, Set<string>>;
  submissionsByPlayer: Map<string, Submission[]>;
  votesByPlayer: Map<string, { downvotedWordIds: string[]; submittedAt: number }>;
  resultsByPlayer: Map<string, PlayerResult> | null;
  votingStartedAt: number | null;
  finishedByPlayer: Set<string>;
}

export interface StartRoundResult {
  ok: boolean;
  roundId?: number;
  letter?: string;
}

export interface SubmitWordResult {
  ok: boolean;
  accepted?: boolean;
  reason?: string;
  blockedByName?: string;
  /** The word the player previously used (set when reason is already_used_by_self). */
  blockedWord?: string;
  /** The category that word was used in (set when reason is already_used_by_self). */
  blockedCategory?: string;
}

export interface SubmitVotesResult {
  ok: boolean;
  reason?: string;
}

export interface FinishRoundResult {
  ok: boolean;
  reason?: string;
}

export interface EndGameResult {
  ok: boolean;
  reason?: string;
}

/**
 * Strategy interface for game-specific word submission behavior.
 */
export interface WordSubmissionStrategy {
  /**
   * Called before accepting a new word. Returns an error result if the word
   * should be rejected, or null to proceed with acceptance.
   */
  validateSubmission(
    round: Round,
    playerId: string,
    key: string,
    category: string,
    existingWord: WordEntry | undefined,
    getPlayerName: (id: string) => string
  ): SubmitWordResult | null;

  /**
   * Called before adding a new accepted word. Allows the strategy to
   * clean up any existing words that should be replaced.
   */
  prepareForNewWord(
    round: Round,
    playerId: string,
    category: string
  ): void;
}

export interface CategoryClashEngine {
  getPhase(): string;
  getState(): Omit<CategoryClashState, 'game' | 'games'>;
  startRound(durationMs: number): StartRoundResult;
  submitWord(playerId: string, wordInput: string, categoryInput?: string): SubmitWordResult;
  submitVotes(playerId: string, downvotedWordIds: unknown): SubmitVotesResult;
  finishRound(playerId: string, roundId: number): FinishRoundResult;
  joinPlayer(payload: { name?: string; playerId?: string }): { ok: boolean; playerId?: string; name?: string; error?: string };
  selectCategory?: (category: string) => { ok: boolean; category?: string; reason?: string };
  selectRandomCategory?: () => { ok: boolean; category?: string; reason?: string };
  selectCategories?: (categories: string[]) => { ok: boolean; categories?: string[]; reason?: string };
  selectRandomCategories?: (count?: number) => { ok: boolean; categories?: string[]; reason?: string };
  addCategory?: (name: string) => { ok: boolean; category?: string; reason?: string };
  endGame(): EndGameResult;
}

/**
 * Create a new empty round structure.
 * @returns Empty round state.
 */
export function createEmptyRound(): Round {
  return {
    id: 0,
    state: 'idle',
    letter: null,
    letters: null,
    category: null,
    categories: [],
    durationMs: null,
    startedAt: null,
    endsAt: null,
    finishDeadline: null,
    participants: [],
    acceptedWords: [],
    acceptedWordByKey: new Map(),
    acceptedWordById: new Map(),
    acceptedByPlayerCategory: new Map(),
    submissionsByPlayer: new Map(),
    votesByPlayer: new Map(),
    resultsByPlayer: null,
    votingStartedAt: null,
    finishedByPlayer: new Set(),
  };
}

/**
 * Normalize a submitted word.
 * @param word Raw input word.
 * @returns Trimmed word string.
 */
function normalizeWord(word: string): string {
  return word.trim();
}

/**
 * Default active-word rule: the word must start with the round's letter.
 * @param round Active round.
 * @param key Uppercased word.
 * @returns Rejection result when the letter does not match, otherwise null.
 */
function defaultValidateActiveWord(round: Round, key: string): SubmitWordResult | null {
  const letter = round.letter || '';
  if (key[0] !== letter.toUpperCase()) {
    return { ok: false, reason: 'invalid_letter' };
  }
  return null;
}

/**
 * Resolve a category input to a valid category name.
 * @param category Input category.
 * @param available Available category list.
 * @returns Matching category or null.
 */
function normalizeCategory(category: unknown, available: string[]): string | null {
  if (!category) {
    return available[0] || null;
  }
  const match = available.find(
    (entry) => entry.toLowerCase() === String(category).trim().toLowerCase()
  );
  return match || null;
}

/**
 * Create the categoryclash engine with state and handlers.
 * @param options Engine configuration and dependencies.
 * @param strategy Game-specific word submission behavior.
 * @returns Category Clash engine instance.
 */
export function createCategoryClashEngine(
  options: CategoryClashEngineOptions,
  strategy: WordSubmissionStrategy
): CategoryClashEngine {
  const onStateChange = options.onStateChange || (() => {});
  const clientGraceMs = Number.isFinite(options.clientGraceMs) ? options.clientGraceMs! : 5000;
  const generateRoundData = options.generateRoundData || ((): RoundData => ({ letter: randomLetter(), letters: null }));
  const validateActiveWord = options.validateActiveWord || defaultValidateActiveWord;
  const scoreWord = options.scoreWord || (() => 1);
  const categoryless = options.categoryless === true;

  let round = createEmptyRound();
  let roundEndTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Notify listeners that state has changed.
   */
  function notifyChange(): void {
    onStateChange();
  }

  const createCategoryManager = options.createCategoryManager;
  const categoryManager = createCategoryManager({
    categories: options.categories,
    onChange: notifyChange,
    canChange: () => round.state !== 'active' && round.state !== 'voting',
  });

  const { playerStore, buildBaseState } = createGameBase({
    categories: options.categories,
    onChange: notifyChange,
    canChange: () => round.state !== 'active' && round.state !== 'voting',
    playerStore: options.playerStore,
    categoryManager: categoryManager as CategoryManager,
  });

  /**
   * Clear any pending round-end timer.
   */
  function clearRoundTimer(): void {
    if (roundEndTimeout) {
      clearTimeout(roundEndTimeout);
      roundEndTimeout = null;
    }
  }

  /**
   * Lookup player name by id.
   * @param playerId Player identifier.
   * @returns Player name or fallback.
   */
  function getPlayerName(playerId: string): string {
    return playerStore.getPlayerName(playerId);
  }

  /**
   * Ensure the player is tracked as a participant for the active round.
   * @param playerId Player identifier.
   */
  function ensureParticipant(playerId: string): void {
    if (round.state !== 'active') {
      return;
    }
    if (!round.participants.includes(playerId)) {
      round.participants.push(playerId);
    }
  }

  /**
   * Build a scores map from accepted words.
   * @returns Record of scores keyed by player id.
   */
  function buildScoresByPlayer(): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const word of round.acceptedWords) {
      scores[word.playerId] = (scores[word.playerId] || 0) + scoreWord(word);
    }
    return scores;
  }

  /**
   * Group accepted words by player for public state.
   * @returns List of grouped words by player.
   */
  function buildWordsByPlayer(): WordsByPlayerEntry[] {
    const groups = new Map<string, WordsByPlayerEntry>();
    for (const word of round.acceptedWords) {
      const playerName = getPlayerName(word.playerId);
      if (!groups.has(word.playerId)) {
        groups.set(word.playerId, {
          playerId: word.playerId,
          playerName,
          words: [],
        });
      }
      groups.get(word.playerId)!.words.push({
        id: word.id,
        word: word.word,
        category: word.category,
      });
    }
    return Array.from(groups.values()).sort((a, b) => a.playerName.localeCompare(b.playerName));
  }

  /**
   * Build a flat anonymous word list in submission order for the voting phase.
   * Each entry carries only an id, the word, and its category — no player
   * identity is included.
   * @returns Array of anonymous word entries.
   */
  function buildAnonymousWords(): { id: string; word: string; category: string }[] {
    return round.acceptedWords.map((w) => ({
      id: w.id,
      word: w.word,
      category: w.category,
    }));
  }

  /**
   * Convert results map to a plain record for public state.
   * @returns Player results record or null.
   */
  function buildResultsByPlayerPublic(): Record<string, PlayerResult> | null {
    if (!round.resultsByPlayer) {
      return null;
    }
    const results: Record<string, PlayerResult> = {};
    for (const [playerId, result] of round.resultsByPlayer.entries()) {
      results[playerId] = result;
    }
    return results;
  }

  /**
   * Read selected categories from the category manager.
   * @returns Array of selected categories.
   */
  function getRoundCategories(): string[] {
    if ('getSelectedCategories' in categoryManager && typeof categoryManager.getSelectedCategories === 'function') {
      return categoryManager.getSelectedCategories();
    }
    if ('getSelectedCategory' in categoryManager && typeof categoryManager.getSelectedCategory === 'function') {
      return [categoryManager.getSelectedCategory()];
    }
    return [];
  }

  /**
   * Build the public round state payload.
   * @returns State object without game metadata.
   */
  function getState(): Omit<CategoryClashState, 'game' | 'games'> {
    return {
      ...buildBaseState(),
      round: {
        id: round.id,
        state: round.state,
        letter: round.letter,
        letters: round.letters,
        category: round.category,
        categories: round.categories,
        durationMs: round.durationMs,
        startedAt: round.startedAt,
        endsAt: round.endsAt,
        participants: round.participants,
        scoresByPlayer: buildScoresByPlayer(),
        wordsByPlayer: buildWordsByPlayer(),
        anonymousWords: round.state === 'voting' ? buildAnonymousWords() : undefined,
        votesSubmittedIds: round.state === 'voting' ? Array.from(round.votesByPlayer.keys()) : [],
        resultsByPlayer: round.state === 'results' ? buildResultsByPlayerPublic() : null,
      },
    };
  }

  /**
   * Get the current round phase.
   * @returns Round state string.
   */
  function getPhase(): string {
    return round.state;
  }

  /**
   * Start a new round and schedule the voting transition.
   * @param durationMs Round duration in milliseconds.
   * @returns Result payload for the start attempt.
   */
  function startRound(durationMs: number): StartRoundResult {
    clearRoundTimer();
    const now = Date.now();
    const nextId = round.id + 1;
    const selectedCategories = getRoundCategories();
    const roundCategories = categoryless
      ? []
      : (selectedCategories.length ? selectedCategories : ['General']);
    const roundData = generateRoundData();
    round = {
      id: nextId,
      state: 'active',
      letter: roundData.letter,
      letters: roundData.letters ?? null,
      category: roundCategories[0] || null,
      categories: roundCategories,
      durationMs,
      startedAt: now,
      endsAt: now + durationMs,
      finishDeadline: now + durationMs + clientGraceMs,
      participants: playerStore.getPlayerIds(),
      acceptedWords: [],
      acceptedWordByKey: new Map(),
      acceptedWordById: new Map(),
      acceptedByPlayerCategory: new Map(),
      submissionsByPlayer: new Map(),
      votesByPlayer: new Map(),
      resultsByPlayer: null,
      votingStartedAt: null,
      finishedByPlayer: new Set(),
    };
    roundEndTimeout = setTimeout(() => {
      moveToVoting();
    }, durationMs + clientGraceMs);
    notifyChange();
    return { ok: true, roundId: round.id, letter: round.letter! };
  }

  /**
   * Transition from active to voting and initialize voting state.
   */
  function moveToVoting(): void {
    if (round.state !== 'active') {
      return;
    }
    clearRoundTimer();
    round.state = 'voting';
    round.votingStartedAt = Date.now();
    round.votesByPlayer = new Map();
    notifyChange();
    // If no one actually submitted words, skip voting
    if (round.submissionsByPlayer.size === 0) {
      finalizeResults();
    }
  }

  /**
   * Store a submission entry for a player.
   * @param playerId Player identifier.
   * @param word Submitted word.
   * @param extra Extra submission metadata.
   */
  function storeSubmission(playerId: string, word: string, extra: Partial<Submission>): void {
    if (!round.submissionsByPlayer.has(playerId)) {
      round.submissionsByPlayer.set(playerId, []);
    }
    round.submissionsByPlayer.get(playerId)!.push({
      word,
      category: extra.category || null,
      status: extra.status || 'unknown',
      ...extra,
    });
  }

  /**
   * Submit a word for the active round.
   * @param playerId Player identifier.
   * @param wordInput Raw word input.
   * @param categoryInput Optional category input.
   * @returns Result payload for the submission.
   */
  function submitWord(playerId: string, wordInput: string, categoryInput?: string): SubmitWordResult {
    if (round.state !== 'active') {
      return { ok: false, reason: 'round_not_active' };
    }

    let category: string;
    if (categoryless) {
      category = '';
    } else {
      const availableCategories = round.categories || [];
      const resolved = normalizeCategory(categoryInput, availableCategories);
      if (!resolved) {
        return { ok: false, reason: 'invalid_category' };
      }
      category = resolved;
    }

    const rawWord = normalizeWord(wordInput || '');
    if (!rawWord) {
      return { ok: false, reason: 'empty' };
    }

    const key = rawWord.toUpperCase();
    const wordRule = validateActiveWord(round, key, rawWord);
    if (wordRule) {
      storeSubmission(playerId, rawWord, { status: 'invalid', category });
      notifyChange();
      return wordRule;
    }

    const existingWord = round.acceptedWordByKey.get(key);
    if (existingWord && existingWord.playerId !== playerId) {
      // Word taken by another player
      storeSubmission(playerId, rawWord, {
        status: 'duplicate',
        blockedByPlayerId: existingWord.playerId,
        category,
      });
      notifyChange();
      return {
        ok: false,
        reason: 'duplicate',
        blockedByName: getPlayerName(existingWord.playerId),
      };
    }

    // Delegate game-specific validation to the strategy
    const validationResult = strategy.validateSubmission(
      round, playerId, key, category, existingWord, getPlayerName
    );
    if (validationResult) {
      storeSubmission(playerId, rawWord, { status: 'invalid', category });
      notifyChange();
      return validationResult;
    }

    // Let the strategy prepare for the new word (e.g., remove old word for category)
    strategy.prepareForNewWord(round, playerId, category);

    // Same-player duplicate check — after prepareForNewWord has had a chance
    // to remove the old entry (Multicat replacement). If the key is still
    // registered, the player is resubmitting the same word without replacement.
    if (existingWord && existingWord.playerId === playerId && round.acceptedWordByKey.get(key)) {
      storeSubmission(playerId, rawWord, {
        status: 'duplicate',
        blockedByPlayerId: existingWord.playerId,
        category,
      });
      notifyChange();
      return {
        ok: false,
        reason: 'duplicate',
        blockedByName: getPlayerName(existingWord.playerId),
      };
    }

    const wordId = crypto.randomBytes(8).toString('hex');
    const word: WordEntry = {
      id: wordId,
      word: rawWord,
      key,
      playerId,
      category,
      downvotedBy: new Set(),
      votedOut: false,
      downvoterNames: [],
    };

    round.acceptedWords.push(word);
    round.acceptedWordByKey.set(key, word);
    round.acceptedWordById.set(wordId, word);

    // Track category usage
    const categoryKey = category.toLowerCase();
    const playerCategories = round.acceptedByPlayerCategory.get(playerId) || new Set();
    playerCategories.add(categoryKey);
    round.acceptedByPlayerCategory.set(playerId, playerCategories);

    storeSubmission(playerId, rawWord, {
      status: 'accepted',
      wordId,
      category,
    });
    notifyChange();

    return { ok: true, accepted: true };
  }

  /**
   * Return players eligible to vote.
   * @returns Array of active participant ids.
   */
  function getActiveParticipants(): string[] {
    // Only players who actually submitted words can vote
    return round.participants.filter((id) => round.submissionsByPlayer.has(id));
  }

  /**
   * Submit votes during the voting phase.
   * @param playerId Player identifier.
   * @param downvotedWordIds Word IDs to downvote.
   * @returns Result payload for the vote submission.
   */
  function submitVotes(playerId: string, downvotedWordIds: unknown): SubmitVotesResult {
    if (round.state !== 'voting') {
      return { ok: false, reason: 'not_voting' };
    }

    // Only allow voting from players who actually submitted words
    if (!round.submissionsByPlayer.has(playerId)) {
      return { ok: false, reason: 'not_participant' };
    }

    if (round.votesByPlayer.has(playerId)) {
      return { ok: false, reason: 'already_voted' };
    }

    const list = Array.isArray(downvotedWordIds) ? downvotedWordIds : [];
    const uniqueIds = new Set<string>(list);
    for (const wordId of uniqueIds) {
      const word = round.acceptedWordById.get(wordId);
      if (!word) {
        continue;
      }
      if (word.playerId === playerId) {
        continue;
      }
      word.downvotedBy.add(playerId);
    }

    round.votesByPlayer.set(playerId, {
      downvotedWordIds: Array.from(uniqueIds),
      submittedAt: Date.now(),
    });

    notifyChange();

    const activeParticipants = getActiveParticipants();
    if (round.votesByPlayer.size >= activeParticipants.length) {
      finalizeResults();
    }

    return { ok: true };
  }

  /**
   * Compute results and transition the round to results state.
   */
  function finalizeResults(): void {
    if (round.state !== 'voting') {
      return;
    }

    // Only count players who actually submitted words for threshold calculation
    const activeParticipants = getActiveParticipants();
    const participantCount = activeParticipants.length || 1;
    const threshold = Math.ceil(participantCount / 2);

    for (const word of round.acceptedWords) {
      const downvoterNames = Array.from(word.downvotedBy).map((id) => getPlayerName(id));
      word.downvoterNames = downvoterNames;
      word.votedOut = word.downvotedBy.size >= threshold;
    }

    // Submissions whose word was replaced (removed from acceptedWords by the
    // strategy's prepareForNewWord) should not count toward scoring.
    const acceptedWordIds = new Set(round.acceptedWords.map((w) => w.id));

    // Only include players who submitted words in results
    const resultsByPlayer = new Map<string, PlayerResult>();
    for (const playerId of round.submissionsByPlayer.keys()) {
      const submissions = round.submissionsByPlayer.get(playerId) || [];
      let rejectedCount = 0;
      let votedOutCount = 0;
      let finalScore = 0;

      const words = submissions
        .filter((submission) => {
          if (submission.status === 'accepted' && submission.wordId) {
            return acceptedWordIds.has(submission.wordId);
          }
          return true;
        })
        .map((submission) => {
          if (submission.status === 'accepted') {
            const word = round.acceptedWordById.get(submission.wordId!);
            const votedOut = word ? word.votedOut : false;
            if (votedOut) {
              votedOutCount += 1;
            } else {
              finalScore += word ? scoreWord(word) : 0;
            }
            return {
              word: submission.word,
              category: submission.category || null,
              status: (votedOut ? 'voted_out' : 'accepted') as 'accepted' | 'voted_out' | 'rejected',
              blockedByName: null,
              downvotedByNames: word ? word.downvoterNames : [],
            };
          }

          rejectedCount += 1;
          return {
            word: submission.word,
            category: submission.category || null,
            status: 'rejected' as const,
            blockedByName: submission.blockedByPlayerId
              ? getPlayerName(submission.blockedByPlayerId)
              : null,
            downvotedByNames: [],
          };
        });

      resultsByPlayer.set(playerId, {
        name: getPlayerName(playerId),
        totalSubmitted: submissions.length,
        rejected: rejectedCount,
        votedOut: votedOutCount,
        finalScore,
        words,
      });
    }

    round.resultsByPlayer = resultsByPlayer;
    round.state = 'results';
    notifyChange();
  }

  /**
   * Mark a player finished and advance to voting if everyone is done.
   * @param playerId Player identifier.
   * @param roundId Round identifier.
   * @returns Result payload for the finish request.
   */
  function finishRound(playerId: string, roundId: number): FinishRoundResult {
    if (round.state !== 'active') {
      return { ok: false, reason: 'not_active' };
    }
    if (roundId !== round.id) {
      return { ok: false, reason: 'wrong_round' };
    }
    ensureParticipant(playerId);
    round.finishedByPlayer.add(playerId);
    if (round.finishedByPlayer.size >= round.participants.length) {
      moveToVoting();
    } else {
      notifyChange();
    }
    return { ok: true };
  }

  /**
   * Join a player and ensure they are tracked for the round.
   * @param payload Player join payload.
   * @returns Result payload from the player store.
   */
  function joinPlayer(payload: { name?: string; playerId?: string }): { ok: boolean; playerId?: string; name?: string; error?: string } {
    const result = playerStore.joinPlayer(payload);
    if (!result.ok) {
      return result;
    }
    ensureParticipant(result.playerId!);
    notifyChange();
    return result;
  }

  /**
   * End the current game/round early, returning to idle state.
   * @returns Result payload for the end game attempt.
   */
  function endGame(): EndGameResult {
    if (round.state === 'idle' || round.state === 'results') {
      return { ok: false, reason: 'not_active' };
    }

    clearRoundTimer();
    round = createEmptyRound();
    notifyChange();
    return { ok: true };
  }

  const engine: CategoryClashEngine = {
    getPhase,
    getState,
    startRound,
    submitWord,
    submitVotes,
    finishRound,
    joinPlayer,
    endGame,
  };

  // Add category methods based on what the category manager supports
  if ('selectCategory' in categoryManager) {
    engine.selectCategory = (categoryManager as CategoryManager).selectCategory;
  }
  if ('selectRandomCategory' in categoryManager) {
    engine.selectRandomCategory = (categoryManager as CategoryManager).selectRandomCategory;
  }
  if ('selectCategories' in categoryManager) {
    engine.selectCategories = (categoryManager as MultiCategoryManager).selectCategories;
  }
  if ('selectRandomCategories' in categoryManager) {
    engine.selectRandomCategories = (categoryManager as MultiCategoryManager).selectRandomCategories;
  }
  if ('addCategory' in categoryManager && typeof categoryManager.addCategory === 'function') {
    engine.addCategory = (categoryManager as { addCategory: (name: string) => { ok: boolean; category?: string; reason?: string } }).addCategory;
  }

  return engine;
}
