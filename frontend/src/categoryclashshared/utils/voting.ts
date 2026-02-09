/**
 * Toggle a word ID in a vote set (add if not present, remove if present).
 * @param voteSet Current set of voted word IDs.
 * @param wordId Word ID to toggle.
 * @returns New set with the word ID toggled.
 */
export function toggleVoteSelection(voteSet: Set<string>, wordId: string): Set<string> {
  const next = new Set(voteSet);
  if (next.has(wordId)) {
    next.delete(wordId);
  } else {
    next.add(wordId);
  }
  return next;
}
