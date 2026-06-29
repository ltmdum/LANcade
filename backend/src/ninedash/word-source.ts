import { pickRandomWordOfLength, getWordsOfLength } from '../shared/utils/word-list.js';

/**
 * Load all nine-letter words from the word-list package.
 * @returns Array of unique uppercase nine-letter words.
 */
export function loadNineLetterWords(): string[] {
  return getWordsOfLength(9);
}

/**
 * Pick a random nine-letter seed word.
 * @param words Optional word list override (for testing).
 * @param rng Optional random source in the range [0, 1) (for testing).
 * @returns A random uppercase nine-letter word.
 */
export function pickRandomNineLetterWord(words?: string[], rng: () => number = Math.random): string {
  return pickRandomWordOfLength(9, words, rng);
}
