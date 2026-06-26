import type { PlayerResult } from '@lancade/shared';

/** A leaderboard row: a player's result plus their id. */
export interface ScoreboardEntry extends PlayerResult {
  playerId: string;
}

/**
 * Build a sorted leaderboard from the round's per-player results. Entries are
 * ordered by final score (desc), then fewest voted-out, then most rejected,
 * then name.
 * @param resultsByPlayer Per-player results keyed by player id, or null.
 * @returns Sorted leaderboard entries (empty when there are no results).
 */
export function buildScoreboard(
  resultsByPlayer: Record<string, PlayerResult> | null | undefined
): ScoreboardEntry[] {
  if (!resultsByPlayer) {
    return [];
  }
  const entries: ScoreboardEntry[] = Object.entries(resultsByPlayer).map(([playerId, data]) => ({
    playerId,
    ...data,
  }));
  entries.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (a.votedOut !== b.votedOut) return a.votedOut - b.votedOut;
    if (a.rejected !== b.rejected) return b.rejected - a.rejected;
    return a.name.localeCompare(b.name);
  });
  return entries;
}
