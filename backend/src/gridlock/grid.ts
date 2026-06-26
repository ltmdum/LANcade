import { pickRandomNineLetterWord } from './word-source.js';

/** A generated Gridlock grid: the seed word and its jumbled letter tiles. */
export interface Grid {
  /** The nine-letter source word the tiles are drawn from. */
  word: string;
  /** The nine letters in jumbled order (row-major for a 3x3 layout). */
  letters: string[];
}

export interface GenerateGridOptions {
  /** Seed word override (must be nine letters). Defaults to a random word. */
  word?: string;
  /** Random source in the range [0, 1) (for testing). */
  rng?: () => number;
}

/** Number of letters/tiles in a Gridlock grid (a 3x3 matrix). */
export const GRID_SIZE = 9;

/**
 * Shuffle an array in place using the Fisher-Yates algorithm.
 * @param items Array to shuffle (mutated).
 * @param rng Random source in the range [0, 1).
 * @returns The same array, shuffled.
 */
function shuffleInPlace<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Generate a jumbled 3x3 letter grid from a nine-letter word. The tiles are
 * shuffled so they do not appear in the source word's original order; if a
 * shuffle happens to reproduce the original order it is retried.
 * @param options Optional seed word and random source overrides.
 * @returns The generated grid with its source word and jumbled tiles.
 */
export function generateGrid(options: GenerateGridOptions = {}): Grid {
  const rng = options.rng || Math.random;
  const word = (options.word || pickRandomNineLetterWord(undefined, rng)).toUpperCase();
  const original = word.split('');

  let letters = shuffleInPlace(original.slice(), rng);
  // Avoid presenting the tiles in the exact order of the source word.
  let attempts = 0;
  while (letters.join('') === word && attempts < 10) {
    letters = shuffleInPlace(letters, rng);
    attempts += 1;
  }

  return { word, letters };
}
