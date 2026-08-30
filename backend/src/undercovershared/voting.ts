import type { UndercoverVoteRound, UndercoverVoteTally } from '@lancade/shared';

/** Result of a vote submission attempt. */
export interface SubmitVotesResult {
  ok: boolean;
  reason?: string;
}

/** Structural slice of a match that vote handling operates on. */
export interface VoteSlice {
  participants: string[];
  votedPlayerIds: Set<string>;
  currentVotes: Map<string, string>;
  voteRounds: UndercoverVoteRound[];
  currentVoteRound: number;
}

/**
 * Extract the target player ID from a vote payload.
 * @param payload Raw vote payload.
 * @returns Target player ID or null if invalid.
 */
export function extractTargetPlayerId(payload: unknown): string | null {
  if (payload && typeof payload === 'object' && 'targetPlayerId' in payload) {
    const target = (payload as { targetPlayerId: unknown }).targetPlayerId;
    if (typeof target === 'string' && target.length > 0) {
      return target;
    }
  }
  return null;
}

/**
 * Build a vote tally from the current votes, sorted by count descending.
 * @param participants Participant player IDs.
 * @param currentVotes Map of voter ID to target ID.
 * @param getPlayerName Name resolver for player IDs.
 * @returns Sorted tally entries.
 */
export function tallyVotes(
  participants: string[],
  currentVotes: Map<string, string>,
  getPlayerName: (playerId: string) => string
): UndercoverVoteTally[] {
  const counts = new Map<string, number>();
  for (const pid of participants) {
    counts.set(pid, 0);
  }
  for (const targetId of currentVotes.values()) {
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
 * Validate and record a player's vote. Players cannot vote for themselves
 * or for non-participants, and cannot vote twice.
 * @param slice Match slice holding the voting state.
 * @param playerId Voter player ID.
 * @param payload Vote payload containing targetPlayerId.
 * @returns Result of the vote submission.
 */
export function validateAndRecordVote(
  slice: VoteSlice,
  playerId: string,
  payload: unknown
): SubmitVotesResult {
  if (!slice.participants.includes(playerId)) {
    return { ok: false, reason: 'not_participant' };
  }
  if (slice.votedPlayerIds.has(playerId)) {
    return { ok: false, reason: 'already_voted' };
  }

  const targetPlayerId = extractTargetPlayerId(payload);
  if (!targetPlayerId) {
    return { ok: false, reason: 'invalid_vote' };
  }
  if (!slice.participants.includes(targetPlayerId)) {
    return { ok: false, reason: 'invalid_target' };
  }
  if (targetPlayerId === playerId) {
    return { ok: false, reason: 'cannot_vote_self' };
  }

  slice.votedPlayerIds.add(playerId);
  slice.currentVotes.set(playerId, targetPlayerId);
  return { ok: true };
}

/**
 * Finalize the current vote round once everyone has voted.
 * Uses plurality: the player with the most votes is the result.
 * If multiple players are tied for most votes, a re-vote is needed.
 * @param slice Match slice holding the voting state.
 * @param getPlayerName Name resolver for player IDs.
 * @returns Whether the vote was a tie and the target player ID when decided.
 */
export function finalizeVoteRound(
  slice: VoteSlice,
  getPlayerName: (playerId: string) => string
): { isTie: boolean; targetPlayerId: string | null } {
  const tally = tallyVotes(slice.participants, slice.currentVotes, getPlayerName);
  const top = tally[0];
  const second = tally[1];
  const isTie = Boolean(second && second.count === top.count);

  slice.voteRounds.push({
    tally,
    votedPlayerIds: [...slice.votedPlayerIds],
    votes: [...slice.currentVotes].map(([playerId, targetPlayerId]) => ({
      playerId,
      targetPlayerId,
    })),
    isTie,
    targetPlayerId: isTie ? null : top.playerId,
  });

  return { isTie, targetPlayerId: isTie ? null : top.playerId };
}

/**
 * Start a new vote round after a tie.
 * @param slice Match slice holding the voting state.
 */
export function startNewVoteRound(slice: VoteSlice): void {
  slice.currentVoteRound += 1;
  slice.votedPlayerIds = new Set();
  slice.currentVotes = new Map();
}
