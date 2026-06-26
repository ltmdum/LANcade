/**
 * Build a multiset (letter -> count) from a list of available tiles.
 * @param tiles Available letters (case-insensitive).
 * @returns Map of uppercase letter to how many tiles bear that letter.
 */
function buildTileCounts(tiles: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tile of tiles) {
    const letter = tile.trim().toUpperCase();
    if (!letter) {
      continue;
    }
    counts.set(letter, (counts.get(letter) || 0) + 1);
  }
  return counts;
}

/**
 * Determine whether a word can be spelled using the available letter tiles.
 * Each tile may be used at most once, so a letter that appears multiple times
 * in the word must appear at least that many times among the tiles.
 * Non-letter characters in the word make it unformable.
 * @param word The candidate word.
 * @param tiles The available letter tiles.
 * @returns True when the word can be formed from the tiles.
 */
export function canFormWordFromTiles(word: string, tiles: string[]): boolean {
  const normalized = (word || '').trim().toUpperCase();
  if (!normalized) {
    return false;
  }
  const remaining = buildTileCounts(tiles);
  for (const char of normalized) {
    if (char < 'A' || char > 'Z') {
      return false;
    }
    const available = remaining.get(char) || 0;
    if (available <= 0) {
      return false;
    }
    remaining.set(char, available - 1);
  }
  return true;
}
