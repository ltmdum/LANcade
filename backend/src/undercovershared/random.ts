/**
 * Shuffle an array using the Fisher-Yates algorithm.
 * @param array Input array.
 * @returns New shuffled array.
 */
export function shuffle<T>(array: T[]): T[] {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Pick a random element from an array.
 * @param array Input array.
 * @returns A random element.
 */
export function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}
