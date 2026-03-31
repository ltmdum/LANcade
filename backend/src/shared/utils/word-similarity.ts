/**
 * Shared word similarity utilities using Damerau-Levenshtein distance.
 * Used by BlankSlate for claim eligibility checking.
 */

/**
 * Calculate the Damerau-Levenshtein distance between two strings.
 * Measures minimum edits (insertions, deletions, substitutions, transpositions).
 * @param a First string.
 * @param b Second string.
 * @returns Edit distance.
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;

  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  const matrix: number[][] = Array.from({ length: lenA + 1 }, () =>
    Array.from({ length: lenB + 1 }, () => 0)
  );

  for (let i = 0; i <= lenA; i++) matrix[i][0] = i;
  for (let j = 0; j <= lenB; j++) matrix[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
      }
    }
  }

  return matrix[lenA][lenB];
}

/**
 * Calculate similarity ratio between two words.
 * @param word1 First word (should be normalized).
 * @param word2 Second word (should be normalized).
 * @returns Similarity ratio from 0 (completely different) to 1 (identical).
 */
export function calculateSimilarity(word1: string, word2: string): number {
  const maxLen = Math.max(word1.length, word2.length);
  if (maxLen === 0) return 1;
  const distance = damerauLevenshteinDistance(word1, word2);
  return 1 - distance / maxLen;
}

