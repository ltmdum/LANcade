/** Result of a word/command submission attempt. */
export interface SubmitWordResult {
  ok: boolean;
  reason?: string;
  role?: 'undercover' | 'civilian';
}

/** Structural slice of a match that the reveal phase operates on. */
export interface RevealSlice {
  participants: string[];
  undercoverPlayerId: string | null;
  revealedPlayerIds: Set<string>;
  readyPlayerIds: Set<string>;
}

/** Structural slice of a match that the discussion phase operates on. */
export interface DiscussionSlice {
  participants: string[];
  discussionReadyPlayerIds: Set<string>;
}

/**
 * Handle the REVEAL action during the reveal phase.
 * @param slice Match slice holding the reveal state.
 * @param playerId Player identifier.
 * @returns Result with the player's role.
 */
export function handleRevealAction(
  slice: RevealSlice,
  playerId: string
): SubmitWordResult {
  if (slice.revealedPlayerIds.has(playerId)) {
    return { ok: false, reason: 'already_revealed' };
  }
  slice.revealedPlayerIds.add(playerId);
  const isUndercover = playerId === slice.undercoverPlayerId;
  return { ok: true, role: isUndercover ? 'undercover' : 'civilian' };
}

/**
 * Handle the READY action during the reveal phase.
 * Calls onAllReady when every participant has readied.
 * @param slice Match slice holding the reveal state.
 * @param playerId Player identifier.
 * @param onAllReady Callback invoked once all players are ready.
 * @returns Result of the ready action.
 */
export function handleReadyAction(
  slice: RevealSlice,
  playerId: string,
  onAllReady: () => void
): SubmitWordResult {
  if (!slice.revealedPlayerIds.has(playerId)) {
    return { ok: false, reason: 'must_reveal_first' };
  }
  if (slice.readyPlayerIds.has(playerId)) {
    return { ok: false, reason: 'already_acted' };
  }
  slice.readyPlayerIds.add(playerId);

  const allReady = slice.participants.every(pid => slice.readyPlayerIds.has(pid));
  if (allReady) {
    onAllReady();
  }
  return { ok: true };
}

/**
 * Handle the READY_FOR_VOTE action during the discussion phase.
 * Calls onAllReady when every participant is ready.
 * @param slice Match slice holding the discussion state.
 * @param playerId Player identifier.
 * @param _wordInput Unused input for signature compatibility.
 * @param onAllReady Callback invoked once all players are ready.
 * @returns Result of the ready action.
 */
export function handleDiscussionReadyAction(
  slice: DiscussionSlice,
  playerId: string,
  _wordInput: string,
  onAllReady: () => void
): SubmitWordResult {
  if (!slice.participants.includes(playerId)) {
    return { ok: false, reason: 'not_participant' };
  }
  if (slice.discussionReadyPlayerIds.has(playerId)) {
    return { ok: false, reason: 'already_acted' };
  }
  slice.discussionReadyPlayerIds.add(playerId);

  if (slice.discussionReadyPlayerIds.size >= slice.participants.length) {
    onAllReady();
  }
  return { ok: true };
}
