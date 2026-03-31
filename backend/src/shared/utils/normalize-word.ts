/**
 * Normalize a word for comparison (lowercase, trimmed).
 * @param word Raw word input.
 * @returns Normalized word.
 */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}
