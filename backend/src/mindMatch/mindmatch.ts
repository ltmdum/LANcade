import type {
  MindMatchState,
  MindMatchRoundState,
  MindMatchPrompt,
  MindMatchSubmission,
  MindMatchClaim,
  MindMatchWordGroup,
  MindMatchRoundResult,
  PlayerInfo,
} from '@lancade/shared';
import { PlayerStore } from '../shared/stores/player-store.js';
import { normalizeWord } from '../shared/utils/normalize-word.js';
import { calculateSimilarity } from '../shared/utils/word-similarity.js';
import promptsData from './prompts.json' with { type: 'json' };

const DEFAULT_WINNING_SCORE = 25;
const POINTS_FOR_PAIR = 3;
const POINTS_FOR_GROUP = 1;
const SIMILARITY_THRESHOLD = 0.6; // Minimum similarity ratio (0-1) for claim eligibility

export interface MindMatchGameOptions {
  onStateChange?: () => void;
  playerStore?: PlayerStore;
}

interface PendingClaim {
  claimantId: string;
  targetWord: string;
}

interface Round {
  id: number;
  state: 'idle' | 'submitting' | 'claiming' | 'voting' | 'results';
  prompt: MindMatchPrompt | null;
  submissions: Map<string, string>;
  durationMs: number | null;
  startedAt: number | null;
  endsAt: number | null;
  finishDeadline: number | null;
  pendingClaims: PendingClaim[];
  claimedOrSkippedPlayers: Set<string>;
  claimableTargets: Map<string, string[]>;
  claims: MindMatchClaim[];
  currentClaimIndex: number;
  result: MindMatchRoundResult | null;
  finishedByPlayer: Set<string>;
}

export interface StartRoundResult {
  ok: boolean;
  roundId?: number;
  reason?: string;
}

export interface SubmitWordResult {
  ok: boolean;
  reason?: string;
}

export interface SubmitClaimResult {
  ok: boolean;
  reason?: string;
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

export interface MindMatchGame {
  id: string;
  name: string;
  getPhase(): string;
  getState(): Omit<MindMatchState, 'game' | 'games'>;
  startRound(durationMs: number): StartRoundResult;
  submitWord(playerId: string, word: string): SubmitWordResult;
  submitClaim(playerId: string, targetWord: string): SubmitClaimResult;
  submitVotes(playerId: string, payload: unknown): SubmitVotesResult;
  finishRound(playerId: string, roundId: number): FinishRoundResult;
  joinPlayer(payload: { name?: string; playerId?: string }): {
    ok: boolean;
    playerId?: string;
    name?: string;
    error?: string;
  };
  endGame(): EndGameResult;
  updateSettings(settings: Record<string, unknown>): { ok: boolean; reason?: string };
}

/**
 * Create an empty round state.
 * @returns Empty round structure.
 */
function createEmptyRound(): Round {
  return {
    id: 0,
    state: 'idle',
    prompt: null,
    submissions: new Map(),
    durationMs: null,
    startedAt: null,
    endsAt: null,
    finishDeadline: null,
    pendingClaims: [],
    claimedOrSkippedPlayers: new Set(),
    claimableTargets: new Map(),
    claims: [],
    currentClaimIndex: 0,
    result: null,
    finishedByPlayer: new Set(),
  };
}

/**
 * Select a random prompt from the list.
 * @param usedIds Set of prompt IDs already used.
 * @returns A random prompt.
 */
function selectRandomPrompt(usedIds: Set<number>): MindMatchPrompt {
  const prompts = promptsData as MindMatchPrompt[];
  const available = prompts.filter((p) => !usedIds.has(p.id));
  const pool = available.length > 0 ? available : prompts;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

/**
 * Create a Mind Match game instance.
 * @param options Game configuration options.
 * @returns Mind Match game instance.
 */
export function createGame(options: MindMatchGameOptions = {}): MindMatchGame {
  const onStateChange = options.onStateChange || (() => {});
  const playerStore = options.playerStore;

  let round = createEmptyRound();
  let scores: Record<string, number> = {};
  let winnerIds: string[] = [];
  let winningScore = DEFAULT_WINNING_SCORE;
  let roundEndTimeout: ReturnType<typeof setTimeout> | null = null;
  const usedPromptIds = new Set<number>();

  /**
   * Notify listeners of state change.
   */
  function notifyChange(): void {
    onStateChange();
  }

  /**
   * Clear the round end timer.
   */
  function clearRoundTimer(): void {
    if (roundEndTimeout) {
      clearTimeout(roundEndTimeout);
      roundEndTimeout = null;
    }
  }

  /**
   * Get player name by ID.
   * @param playerId Player identifier.
   * @returns Player name or fallback.
   */
  function getPlayerName(playerId: string): string {
    if (playerStore) {
      return playerStore.getPlayerName(playerId);
    }
    return 'Unknown';
  }

  /**
   * Get all players.
   * @returns Array of player info.
   */
  function getPlayers(): PlayerInfo[] {
    if (playerStore) {
      return playerStore.listPlayers();
    }
    return [];
  }

  /**
   * Get all player IDs.
   * @returns Array of player IDs.
   */
  function getPlayerIds(): string[] {
    if (playerStore) {
      return playerStore.getPlayerIds();
    }
    return [];
  }

  /**
   * Build the public round state.
   * @returns Public round state object.
   */
  function buildRoundState(): MindMatchRoundState {
    const submissions: MindMatchSubmission[] = [];
    // Only show submissions in claiming/voting/results phases
    if (round.state === 'claiming' || round.state === 'voting' || round.state === 'results') {
      for (const [playerId, word] of round.submissions.entries()) {
        submissions.push({
          playerId,
          playerName: getPlayerName(playerId),
          word,
        });
      }
    }

    // Convert claimableTargets Map to plain object for serialization
    const claimableTargets: Record<string, string[]> = {};
    for (const [playerId, targets] of round.claimableTargets.entries()) {
      claimableTargets[playerId] = targets;
    }

    return {
      id: round.id,
      state: round.state,
      prompt: round.prompt,
      submissions,
      submittedPlayerIds: Array.from(round.submissions.keys()),
      durationMs: round.durationMs,
      startedAt: round.startedAt,
      endsAt: round.endsAt,
      claims: round.claims,
      currentClaimIndex: round.currentClaimIndex,
      result: round.result,
      claimableTargets,
    };
  }

  /**
   * Build the public game state.
   * @returns Full game state without metadata.
   */
  function getState(): Omit<MindMatchState, 'game' | 'games'> {
    return {
      serverTime: Date.now(),
      players: getPlayers(),
      settings: {
        categories: [],
        selectedCategory: '',
      },
      gameSettings: { winningScore },
      round: buildRoundState(),
      scores,
      winnerIds,
      winnerNames: winnerIds.map((id) => getPlayerName(id)),
    };
  }

  /**
   * Get the current game phase.
   * @returns Phase string.
   */
  function getPhase(): string {
    if (winnerIds.length > 0) {
      return 'finished';
    }
    return round.state;
  }

  /**
   * Group submissions by normalized word.
   * @returns Map of normalized word to player IDs.
   */
  function groupSubmissions(): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const [playerId, word] of round.submissions.entries()) {
      const key = normalizeWord(word);
      const existing = groups.get(key) || [];
      existing.push(playerId);
      groups.set(key, existing);
    }
    return groups;
  }

  /**
   * Find players with unique words who can make claims.
   * @param groups Current word groups.
   * @returns Array of player IDs with unique words.
   */
  function findUniqueWordPlayers(groups: Map<string, string[]>): string[] {
    const uniquePlayers: string[] = [];
    for (const [, playerIds] of groups) {
      if (playerIds.length === 1) {
        uniquePlayers.push(playerIds[0]);
      }
    }
    return uniquePlayers;
  }

  /**
   * Find similar words for a given word from all submissions.
   * @param playerWord The player's word (will be normalized internally).
   * @param groups All word groups.
   * @returns Array of original words that meet similarity threshold.
   */
  function findSimilarClaimTargets(
    playerWord: string,
    groups: Map<string, string[]>
  ): string[] {
    const similarWords: string[] = [];
    const normalizedPlayerWord = normalizeWord(playerWord);

    for (const [normalizedWord] of groups) {
      if (normalizedWord === normalizedPlayerWord) continue;

      const similarity = calculateSimilarity(normalizedPlayerWord, normalizedWord);
      if (similarity >= SIMILARITY_THRESHOLD) {
        const originalWord = findOriginalWord(normalizedWord);
        similarWords.push(originalWord);
      }
    }

    return similarWords;
  }

  /**
   * Calculate points for each group.
   * @param playerIds Array of player IDs in the group.
   * @returns Points awarded per player.
   */
  function calculateGroupPoints(playerIds: string[]): number {
    if (playerIds.length === 2) {
      return POINTS_FOR_PAIR;
    }
    if (playerIds.length > 2) {
      return POINTS_FOR_GROUP;
    }
    return 0;
  }

  /**
   * Build final results and update scores.
   * @param groups Word groups after claims are resolved.
   * @returns Round result object.
   */
  function buildResults(groups: Map<string, string[]>): MindMatchRoundResult {
    const wordGroups: MindMatchWordGroup[] = [];
    const scoreChanges: Record<string, number> = {};

    for (const [word, playerIds] of groups) {
      const points = calculateGroupPoints(playerIds);
      const originalWord = findOriginalWord(word);
      wordGroups.push({
        word: originalWord,
        playerIds,
        playerNames: playerIds.map((id) => getPlayerName(id)),
        points,
      });

      for (const playerId of playerIds) {
        scoreChanges[playerId] = (scoreChanges[playerId] || 0) + points;
        scores[playerId] = (scores[playerId] || 0) + points;
      }
    }

    // Sort groups by points (highest first), then by player count
    wordGroups.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.playerIds.length - a.playerIds.length;
    });

    return { groups: wordGroups, scoreChanges };
  }

  /**
   * Find the original (non-normalized) word from submissions.
   * @param normalizedWord Normalized word key.
   * @returns Original word or the normalized one.
   */
  function findOriginalWord(normalizedWord: string): string {
    for (const [, word] of round.submissions.entries()) {
      if (normalizeWord(word) === normalizedWord) {
        return word;
      }
    }
    return normalizedWord;
  }

  /**
   * Check for a winner after score updates.
   * Among players at or above winningScore, the highest scorer wins.
   * If multiple players share the highest score, it's a tie.
   */
  function checkForWinner(): void {
    const qualified: { id: string; score: number }[] = [];
    for (const [playerId, score] of Object.entries(scores)) {
      if (score >= winningScore) {
        qualified.push({ id: playerId, score });
      }
    }

    if (qualified.length === 0) {
      winnerIds = [];
      return;
    }

    const maxScore = Math.max(...qualified.map((p) => p.score));
    const topPlayers = qualified.filter((p) => p.score === maxScore);

    if (topPlayers.length === 1) {
      winnerIds = [topPlayers[0].id];
    } else {
      winnerIds = topPlayers.map((p) => p.id);
    }
  }

  /**
   * Move to claiming phase or skip to results.
   * Only enters claiming if there are unique words with similar claim targets.
   */
  function moveToClaiming(): void {
    if (round.state !== 'submitting') {
      return;
    }

    clearRoundTimer();
    const groups = groupSubmissions();
    const uniquePlayers = findUniqueWordPlayers(groups);

    if (uniquePlayers.length === 0) {
      // No unique words, go straight to results
      finalizeResults();
      return;
    }

    // Build claimable targets for each unique player based on similarity
    round.claimableTargets = new Map();
    let anyClaimableTargets = false;

    for (const playerId of uniquePlayers) {
      const playerWord = round.submissions.get(playerId);
      if (!playerWord) continue;

      const similarWords = findSimilarClaimTargets(playerWord, groups);
      if (similarWords.length > 0) {
        round.claimableTargets.set(playerId, similarWords);
        anyClaimableTargets = true;
      }
    }

    // If no unique player has any similar words to claim, skip to results
    if (!anyClaimableTargets) {
      finalizeResults();
      return;
    }

    round.state = 'claiming';
    round.pendingClaims = [];
    round.claimedOrSkippedPlayers = new Set();
    round.claims = [];
    round.currentClaimIndex = 0;
    notifyChange();
  }

  /**
   * Check if all unique word players (with claimable targets) have claimed or skipped.
   * @returns True if all eligible unique players have acted.
   */
  function allUniquePlayersActed(): boolean {
    // Only consider players who have claimable targets
    for (const playerId of round.claimableTargets.keys()) {
      if (!round.claimedOrSkippedPlayers.has(playerId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Determine which players benefit from a claim being accepted.
   * @param claimantId The player making the claim.
   * @param targetPlayerIds Players in the target group.
   * @returns Set of player IDs who benefit.
   */
  function getBeneficiaries(claimantId: string, targetPlayerIds: string[]): Set<string> {
    const beneficiaries = new Set<string>();

    // Claimant always benefits (goes from 0 points to either 3 or 1)
    beneficiaries.add(claimantId);

    // Target group members benefit only if they currently have a unique word
    // (going from 0 points to 3 points when paired)
    if (targetPlayerIds.length === 1) {
      beneficiaries.add(targetPlayerIds[0]);
    }
    // Groups of 2+ don't benefit (they either lose points or stay the same)

    return beneficiaries;
  }

  /**
   * Process pending claims and move to voting or results.
   * Claims on unique words are auto-rejected unless mutual.
   * Mutual claims go to voting but beneficiaries cannot vote.
   */
  function processPendingClaims(): void {
    if (round.state !== 'claiming') {
      return;
    }

    const groups = groupSubmissions();
    const validClaims: MindMatchClaim[] = [];

    // Track mutual claims (both players claimed each other)
    const mutualPairs = new Set<string>();

    for (const pending of round.pendingClaims) {
      const normalizedTarget = normalizeWord(pending.targetWord);
      const targetGroup = groups.get(normalizedTarget);

      if (!targetGroup) continue;

      const playerWord = round.submissions.get(pending.claimantId);
      if (!playerWord) continue;

      // Check if target is a unique word (single player)
      if (targetGroup.length === 1) {
        const targetPlayerId = targetGroup[0];

        // Check if the target player also claimed this player's word
        const reverseClaimExists = round.pendingClaims.some(
          (c) =>
            c.claimantId === targetPlayerId &&
            normalizeWord(c.targetWord) === normalizeWord(playerWord)
        );

        if (reverseClaimExists) {
          // Mutual claim - goes to voting (but both parties are beneficiaries and can't vote)
          const pairKey = [pending.claimantId, targetPlayerId].sort().join('|');
          if (!mutualPairs.has(pairKey)) {
            mutualPairs.add(pairKey);
            validClaims.push({
              claimantId: pending.claimantId,
              claimantName: getPlayerName(pending.claimantId),
              claimantWord: playerWord,
              targetWord: pending.targetWord,
              targetPlayerIds: [targetPlayerId],
              votes: {},
              resolved: false,
              accepted: false,
              isMutual: true,
            });
          }
        } else {
          // Non-mutual claim on unique word - auto-reject
          validClaims.push({
            claimantId: pending.claimantId,
            claimantName: getPlayerName(pending.claimantId),
            claimantWord: playerWord,
            targetWord: pending.targetWord,
            targetPlayerIds: [targetPlayerId],
            votes: {},
            resolved: true,
            accepted: false,
            isMutual: false,
          });
        }
      } else {
        // Target is a group (2+ players) - requires voting
        validClaims.push({
          claimantId: pending.claimantId,
          claimantName: getPlayerName(pending.claimantId),
          claimantWord: playerWord,
          targetWord: pending.targetWord,
          targetPlayerIds: targetGroup,
          votes: {},
          resolved: false,
          accepted: false,
          isMutual: false,
        });
      }
    }

    round.claims = validClaims;
    round.currentClaimIndex = 0;

    // Find first unresolved claim
    while (
      round.currentClaimIndex < round.claims.length &&
      round.claims[round.currentClaimIndex].resolved
    ) {
      round.currentClaimIndex++;
    }

    if (round.currentClaimIndex < round.claims.length) {
      round.state = 'voting';
      notifyChange();
    } else {
      // All claims auto-resolved, go to results
      finalizeResults();
    }
  }

  /**
   * Move to voting phase for the current claim.
   */
  function moveToVoting(): void {
    if (round.state !== 'claiming' || round.claims.length === 0) {
      return;
    }

    round.state = 'voting';
    notifyChange();
  }

  /**
   * Process the current vote and move to next claim or results.
   * Only non-benefiting players' votes are counted.
   */
  function processVoteResult(): void {
    const claim = round.claims[round.currentClaimIndex];
    if (!claim) return;

    // Determine who benefits from this claim
    const beneficiaries = getBeneficiaries(claim.claimantId, claim.targetPlayerIds);

    // Eligible voters are all players except beneficiaries
    const eligibleVoters = getPlayerIds().filter((id) => !beneficiaries.has(id));

    // If no eligible voters, auto-accept (no one is harmed)
    if (eligibleVoters.length === 0) {
      claim.accepted = true;
      claim.resolved = true;
    } else {
      // Count votes from eligible voters only
      const eligibleVoteEntries = Object.entries(claim.votes).filter(
        ([voterId]) => !beneficiaries.has(voterId)
      );
      const totalVotes = eligibleVoteEntries.length;

      if (totalVotes < eligibleVoters.length) {
        return; // Not all votes in yet
      }

      // Count accepts from eligible voters
      const accepts = eligibleVoteEntries.filter(([, vote]) => vote === 'accept').length;

      // 50% or more of eligible voters must accept
      claim.accepted = accepts >= eligibleVoters.length / 2;
      claim.resolved = true;
    }

    // If accepted, merge the claimant into the target group
    if (claim.accepted) {
      if (claim.isMutual) {
        // Mutual claim - randomly choose which word both players will share
        const targetPlayerId = claim.targetPlayerIds[0];
        const useTargetWord = Math.random() < 0.5;
        const sharedWord = useTargetWord
          ? round.submissions.get(targetPlayerId)
          : round.submissions.get(claim.claimantId);
        if (sharedWord) {
          round.submissions.set(claim.claimantId, sharedWord);
          round.submissions.set(targetPlayerId, sharedWord);
        }
      } else {
        // Non-mutual: claimant adopts target's word
        const targetPlayerId = claim.targetPlayerIds[0];
        const targetWord = round.submissions.get(targetPlayerId);
        if (targetWord) {
          round.submissions.set(claim.claimantId, targetWord);
        }
      }
    }

    // Move to next claim or finalize
    round.currentClaimIndex++;

    // Find next unresolved claim
    while (
      round.currentClaimIndex < round.claims.length &&
      round.claims[round.currentClaimIndex].resolved
    ) {
      round.currentClaimIndex++;
    }

    if (round.currentClaimIndex < round.claims.length) {
      notifyChange();
    } else {
      finalizeResults();
    }
  }

  /**
   * Finalize results and check for winner.
   */
  function finalizeResults(): void {
    const groups = groupSubmissions();
    round.result = buildResults(groups);
    round.state = 'results';
    checkForWinner();
    notifyChange();
  }

  /**
   * Start a new round with a random prompt.
   * @param _durationMs Unused (kept for API compatibility).
   * @returns Start result.
   */
  function startRound(_durationMs: number): StartRoundResult {
    const playerIds = getPlayerIds();
    if (playerIds.length < 3) {
      return { ok: false, reason: 'need_3_players' };
    }

    if (winnerIds.length > 0) {
      // Reset for new game
      winnerIds = [];
      scores = {};
      usedPromptIds.clear();
    }

    clearRoundTimer();
    const now = Date.now();
    const prompt = selectRandomPrompt(usedPromptIds);
    usedPromptIds.add(prompt.id);

    round = {
      id: round.id + 1,
      state: 'submitting',
      prompt,
      submissions: new Map(),
      durationMs: null,
      startedAt: now,
      endsAt: null,
      finishDeadline: null,
      pendingClaims: [],
      claimedOrSkippedPlayers: new Set(),
      claims: [],
      currentClaimIndex: 0,
      result: null,
      finishedByPlayer: new Set(),
      claimableTargets: new Map(),
    };

    notifyChange();
    return { ok: true, roundId: round.id };
  }

  /**
   * Check if all players have submitted and advance to claiming if so.
   */
  function checkAllSubmitted(): void {
    if (round.state !== 'submitting') {
      return;
    }
    const playerIds = getPlayerIds();
    if (round.submissions.size >= playerIds.length) {
      moveToClaiming();
    }
  }

  /**
   * Submit a word for the current round, or a claim during claiming phase.
   * @param playerId Player identifier.
   * @param word Word to submit (or target word for claim).
   * @returns Submit result.
   */
  function submitWord(playerId: string, word: string): SubmitWordResult {
    // Handle claim submission during claiming phase
    if (round.state === 'claiming') {
      const result = submitClaim(playerId, word);
      return result;
    }

    if (round.state !== 'submitting') {
      return { ok: false, reason: 'round_not_active' };
    }

    const trimmed = word.trim();
    if (!trimmed) {
      return { ok: false, reason: 'empty' };
    }

    round.submissions.set(playerId, trimmed);
    checkAllSubmitted();
    if (round.state === 'submitting') {
      // Only notify if we didn't already transition (moveToClaiming notifies)
      notifyChange();
    }
    return { ok: true };
  }

  /**
   * Submit a claim to join another word group.
   * Only allows claiming words that meet the similarity threshold.
   * @param playerId Claimant player ID.
   * @param targetWord Word the claimant wants to join.
   * @returns Claim result.
   */
  function submitClaim(playerId: string, targetWord: string): SubmitClaimResult {
    if (round.state !== 'claiming') {
      return { ok: false, reason: 'not_claiming_phase' };
    }

    // Check if this player has claimable targets
    const allowedTargets = round.claimableTargets.get(playerId);
    if (!allowedTargets || allowedTargets.length === 0) {
      return { ok: false, reason: 'no_claimable_targets' };
    }

    // Check if player already submitted a claim or skipped
    if (round.claimedOrSkippedPlayers.has(playerId)) {
      return { ok: false, reason: 'already_claimed' };
    }

    // Validate the target word is in the player's allowed targets
    const normalizedTarget = normalizeWord(targetWord);
    const isAllowedTarget = allowedTargets.some(
      (allowed) => normalizeWord(allowed) === normalizedTarget
    );

    if (!isAllowedTarget) {
      return { ok: false, reason: 'target_not_similar_enough' };
    }

    // Find the target group
    const groups = groupSubmissions();
    const targetGroup = groups.get(normalizedTarget);
    if (!targetGroup) {
      return { ok: false, reason: 'target_not_found' };
    }

    // Add to pending claims
    round.pendingClaims.push({
      claimantId: playerId,
      targetWord,
    });
    round.claimedOrSkippedPlayers.add(playerId);

    // Check if all unique players have acted
    if (allUniquePlayersActed()) {
      processPendingClaims();
    } else {
      notifyChange();
    }

    return { ok: true };
  }

  /**
   * Submit a vote on the current claim.
   * Only non-benefiting players can vote.
   * @param playerId Voter player ID.
   * @param payload Vote payload with decision.
   * @returns Vote result.
   */
  function submitVotes(playerId: string, payload: unknown): SubmitVotesResult {
    if (round.state !== 'voting') {
      return { ok: false, reason: 'not_voting' };
    }

    const claim = round.claims[round.currentClaimIndex];
    if (!claim) {
      return { ok: false, reason: 'no_claim' };
    }

    // Determine beneficiaries
    const beneficiaries = getBeneficiaries(claim.claimantId, claim.targetPlayerIds);

    // Beneficiaries cannot vote
    if (beneficiaries.has(playerId)) {
      return { ok: false, reason: 'beneficiary_cannot_vote' };
    }

    // Already voted
    if (claim.votes[playerId]) {
      return { ok: false, reason: 'already_voted' };
    }

    const decision =
      payload && typeof payload === 'object' && 'decision' in payload
        ? (payload as { decision: string }).decision
        : payload;

    if (decision !== 'accept' && decision !== 'reject') {
      return { ok: false, reason: 'invalid_vote' };
    }

    claim.votes[playerId] = decision as 'accept' | 'reject';
    processVoteResult();
    return { ok: true };
  }

  /**
   * Skip claiming phase (for players who don't want to claim).
   * @param playerId Player identifier.
   * @returns Result.
   */
  function skipClaim(playerId: string): { ok: boolean; reason?: string } {
    if (round.state !== 'claiming') {
      return { ok: false, reason: 'not_claiming_phase' };
    }

    // Check if player has claimable targets (only they need to act)
    if (!round.claimableTargets.has(playerId)) {
      return { ok: false, reason: 'no_action_required' };
    }

    // Check if player already acted
    if (round.claimedOrSkippedPlayers.has(playerId)) {
      return { ok: false, reason: 'already_acted' };
    }

    // Mark this player as having skipped
    round.claimedOrSkippedPlayers.add(playerId);

    // Check if all unique players have acted
    if (allUniquePlayersActed()) {
      processPendingClaims();
    } else {
      notifyChange();
    }

    return { ok: true };
  }

  /**
   * Signal that a player has finished submitting.
   * @param playerId Player identifier.
   * @param roundId Round identifier.
   * @returns Finish result.
   */
  function finishRound(playerId: string, roundId: number): FinishRoundResult {
    if (round.state === 'submitting') {
      if (roundId !== round.id) {
        return { ok: false, reason: 'wrong_round' };
      }
      round.finishedByPlayer.add(playerId);

      const playerIds = getPlayerIds();
      if (round.finishedByPlayer.size >= playerIds.length) {
        moveToClaiming();
      } else {
        notifyChange();
      }
      return { ok: true };
    }

    if (round.state === 'claiming') {
      return skipClaim(playerId);
    }

    return { ok: false, reason: 'invalid_state' };
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
      // Initialize score for new players
      if (result.playerId && scores[result.playerId] === undefined) {
        scores[result.playerId] = 0;
      }
      notifyChange();
    }
    return result;
  }

  /**
   * End the current game/round early.
   * @returns End result.
   */
  function endGame(): EndGameResult {
    if (round.state === 'idle' && winnerIds.length === 0) {
      return { ok: false, reason: 'not_active' };
    }

    clearRoundTimer();
    round = createEmptyRound();
    scores = {};
    winnerIds = [];
    notifyChange();
    return { ok: true };
  }

  /**
   * Update admin-configurable settings (only when idle).
   * @param settings Settings object with winningScore.
   * @returns Result indicating success or failure.
   */
  function updateSettings(settings: Record<string, unknown>) {
    if (round.state !== 'idle') {
      return { ok: false, reason: 'game_active' };
    }
    if (winnerIds.length > 0) {
      return { ok: false, reason: 'game_active' };
    }
    let changed = false;
    for (const key of Object.keys(settings)) {
      const val = settings[key];
      if (key === 'winningScore') {
        if (typeof val !== 'number' || !Number.isInteger(val) || val < 5 || val > 100) {
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

  return {
    id: 'mindmatch',
    name: 'Mind Match',
    getPhase,
    getState,
    startRound,
    submitWord,
    submitClaim,
    submitVotes,
    finishRound,
    joinPlayer,
    endGame,
    updateSettings,
  };
}
