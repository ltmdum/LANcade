import type {
  BlankSlateState,
  BlankSlateRoundState,
  BlankSlatePrompt,
  BlankSlateSubmission,
  BlankSlateClaim,
  BlankSlateWordGroup,
  BlankSlateRoundResult,
  PlayerInfo,
} from '@lancade/shared';
import { PlayerStore } from '../shared/stores/player-store.js';
import promptsData from './prompts.json' with { type: 'json' };

const WINNING_SCORE = 25;
const POINTS_FOR_PAIR = 3;
const POINTS_FOR_GROUP = 1;

export interface BlankSlateGameOptions {
  onStateChange?: () => void;
  clientGraceMs?: number;
  playerStore?: PlayerStore;
}

interface PendingClaim {
  claimantId: string;
  targetWord: string;
}

interface Round {
  id: number;
  state: 'idle' | 'submitting' | 'claiming' | 'voting' | 'results';
  prompt: BlankSlatePrompt | null;
  submissions: Map<string, string>;
  durationMs: number | null;
  startedAt: number | null;
  endsAt: number | null;
  finishDeadline: number | null;
  pendingClaims: PendingClaim[];
  claimedOrSkippedPlayers: Set<string>;
  claims: BlankSlateClaim[];
  currentClaimIndex: number;
  result: BlankSlateRoundResult | null;
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

export interface BlankSlateGame {
  id: string;
  name: string;
  getPhase(): string;
  getState(): Omit<BlankSlateState, 'game' | 'games'>;
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
    claims: [],
    currentClaimIndex: 0,
    result: null,
    finishedByPlayer: new Set(),
  };
}

/**
 * Normalize a word for comparison (lowercase, trimmed).
 * @param word Raw word input.
 * @returns Normalized word.
 */
function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}

/**
 * Select a random prompt from the list.
 * @param usedIds Set of prompt IDs already used.
 * @returns A random prompt.
 */
function selectRandomPrompt(usedIds: Set<number>): BlankSlatePrompt {
  const prompts = promptsData as BlankSlatePrompt[];
  const available = prompts.filter((p) => !usedIds.has(p.id));
  const pool = available.length > 0 ? available : prompts;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

/**
 * Create a BlankSlate game instance.
 * @param options Game configuration options.
 * @returns BlankSlate game instance.
 */
export function createGame(options: BlankSlateGameOptions = {}): BlankSlateGame {
  const onStateChange = options.onStateChange || (() => {});
  const clientGraceMs = Number.isFinite(options.clientGraceMs) ? options.clientGraceMs! : 5000;
  const playerStore = options.playerStore;

  let round = createEmptyRound();
  let scores: Record<string, number> = {};
  let winnerId: string | null = null;
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
  function buildRoundState(): BlankSlateRoundState {
    const submissions: BlankSlateSubmission[] = [];
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
    };
  }

  /**
   * Build the public game state.
   * @returns Full game state without metadata.
   */
  function getState(): Omit<BlankSlateState, 'game' | 'games'> {
    return {
      serverTime: Date.now(),
      players: getPlayers(),
      settings: {
        categories: [],
        selectedCategory: '',
      },
      round: buildRoundState(),
      scores,
      winnerId,
      winnerName: winnerId ? getPlayerName(winnerId) : null,
    };
  }

  /**
   * Get the current game phase.
   * @returns Phase string.
   */
  function getPhase(): string {
    if (winnerId) {
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
  function buildResults(groups: Map<string, string[]>): BlankSlateRoundResult {
    const wordGroups: BlankSlateWordGroup[] = [];
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
   */
  function checkForWinner(): void {
    for (const [playerId, score] of Object.entries(scores)) {
      if (score >= WINNING_SCORE) {
        winnerId = playerId;
        break;
      }
    }
  }

  /**
   * Move to claiming phase or skip to results.
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

    round.state = 'claiming';
    round.pendingClaims = [];
    round.claimedOrSkippedPlayers = new Set();
    round.claims = [];
    round.currentClaimIndex = 0;
    notifyChange();
  }

  /**
   * Check if all unique word players have claimed or skipped.
   * @returns True if all unique players have acted.
   */
  function allUniquePlayersActed(): boolean {
    const groups = groupSubmissions();
    const uniquePlayers = findUniqueWordPlayers(groups);
    return uniquePlayers.every((id) => round.claimedOrSkippedPlayers.has(id));
  }

  /**
   * Process pending claims and move to voting or results.
   * Handles mutual claim validation for unique-to-unique claims.
   */
  function processPendingClaims(): void {
    if (round.state !== 'claiming') {
      return;
    }

    const groups = groupSubmissions();
    const validClaims: BlankSlateClaim[] = [];

    // Track which claims are mutual (both players claimed each other)
    const mutualPairs = new Set<string>();

    for (const pending of round.pendingClaims) {
      const normalizedTarget = normalizeWord(pending.targetWord);
      const targetGroup = groups.get(normalizedTarget);

      if (!targetGroup) continue;

      // Check if target is a unique word (single player)
      if (targetGroup.length === 1) {
        const targetPlayerId = targetGroup[0];
        // Check if the target player also claimed this player's word
        const playerWord = round.submissions.get(pending.claimantId);
        if (!playerWord) continue;

        const reverseClaimExists = round.pendingClaims.some(
          (c) =>
            c.claimantId === targetPlayerId &&
            normalizeWord(c.targetWord) === normalizeWord(playerWord)
        );

        if (reverseClaimExists) {
          // Mutual claim - create a single merged claim with pre-accepted votes
          const pairKey = [pending.claimantId, targetPlayerId].sort().join('|');
          if (!mutualPairs.has(pairKey)) {
            mutualPairs.add(pairKey);
            validClaims.push({
              claimantId: pending.claimantId,
              claimantName: getPlayerName(pending.claimantId),
              claimantWord: playerWord,
              targetWord: pending.targetWord,
              targetPlayerIds: [targetPlayerId],
              votes: {
                [pending.claimantId]: 'accept',
                [targetPlayerId]: 'accept',
              },
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
        // Target is a group (2+ players) - no mutual requirement
        const claimantWord = round.submissions.get(pending.claimantId);
        if (!claimantWord) continue;
        validClaims.push({
          claimantId: pending.claimantId,
          claimantName: getPlayerName(pending.claimantId),
          claimantWord,
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
   */
  function processVoteResult(): void {
    const claim = round.claims[round.currentClaimIndex];
    if (!claim) return;

    // For mutual claims, exclude both claimant and target from eligible voters
    const excludedVoters = claim.isMutual
      ? [claim.claimantId, ...claim.targetPlayerIds]
      : [claim.claimantId];
    const eligibleVoters = getPlayerIds().filter((id) => !excludedVoters.includes(id));
    const totalVotes = Object.keys(claim.votes).filter((id) => !excludedVoters.includes(id)).length;

    if (totalVotes < eligibleVoters.length) {
      return; // Not all votes in yet
    }

    // Count accepts (including pre-populated votes from mutual claimants)
    const accepts = Object.values(claim.votes).filter((v) => v === 'accept').length;
    const totalVoters = eligibleVoters.length + (claim.isMutual ? 2 : 0);
    const threshold = Math.ceil(totalVoters / 2);
    claim.accepted = accepts >= threshold;
    claim.resolved = true;

    // If accepted, merge the claimant into the target group
    if (claim.accepted) {
      const targetPlayerId = claim.targetPlayerIds[0];
      if (claim.isMutual) {
        // Randomly choose which word both players will share
        const useTargetWord = Math.round(Math.random()) === 1;
        const sharedWord = useTargetWord
          ? round.submissions.get(targetPlayerId)
          : round.submissions.get(claim.claimantId);
        if (sharedWord) {
          round.submissions.set(claim.claimantId, sharedWord);
          round.submissions.set(targetPlayerId, sharedWord);
        }
      } else {
        // Non-mutual: claimant adopts target's word
        const targetWord = round.submissions.get(targetPlayerId);
        if (targetWord) {
          round.submissions.set(claim.claimantId, targetWord);
        }
      }
    }

    // Move to next claim or finalize
    round.currentClaimIndex++;
    if (round.currentClaimIndex < round.claims.length) {
      round.state = 'claiming';
    } else {
      finalizeResults();
    }
    notifyChange();
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

    if (winnerId) {
      // Reset for new game
      winnerId = null;
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
   * @param playerId Claimant player ID.
   * @param targetWord Word the claimant wants to join.
   * @returns Claim result.
   */
  function submitClaim(playerId: string, targetWord: string): SubmitClaimResult {
    if (round.state !== 'claiming') {
      return { ok: false, reason: 'not_claiming_phase' };
    }

    // Check if this player has a unique word
    const groups = groupSubmissions();
    const playerWord = round.submissions.get(playerId);
    if (!playerWord) {
      return { ok: false, reason: 'no_submission' };
    }

    const normalizedPlayerWord = normalizeWord(playerWord);
    const playerGroup = groups.get(normalizedPlayerWord);
    if (!playerGroup || playerGroup.length !== 1) {
      return { ok: false, reason: 'not_unique' };
    }

    // Check if player already submitted a claim or skipped
    if (round.claimedOrSkippedPlayers.has(playerId)) {
      return { ok: false, reason: 'already_claimed' };
    }

    // Find the target group
    const normalizedTarget = normalizeWord(targetWord);
    const targetGroup = groups.get(normalizedTarget);
    if (!targetGroup) {
      return { ok: false, reason: 'target_not_found' };
    }

    // Can't claim your own word
    if (normalizedTarget === normalizedPlayerWord) {
      return { ok: false, reason: 'cannot_claim_own' };
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

    // Claimant cannot vote
    if (playerId === claim.claimantId) {
      return { ok: false, reason: 'claimant_cannot_vote' };
    }

    // Already voted
    if (claim.votes[playerId]) {
      return { ok: false, reason: 'already_voted' };
    }

    const decision = payload && typeof payload === 'object' && 'decision' in payload
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
    if (round.state === 'idle' && !winnerId) {
      return { ok: false, reason: 'not_active' };
    }

    clearRoundTimer();
    round = createEmptyRound();
    scores = {};
    winnerId = null;
    notifyChange();
    return { ok: true };
  }

  return {
    id: 'blankslate',
    name: 'BlankSlate',
    getPhase,
    getState,
    startRound,
    submitWord,
    submitClaim,
    submitVotes,
    finishRound,
    joinPlayer,
    endGame,
  };
}
