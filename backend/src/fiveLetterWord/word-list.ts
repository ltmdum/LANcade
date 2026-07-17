import { getWordsOfLength, getAnswerWordsOfLength, pickRandomWordOfLength } from '../shared/utils/word-list.js';

/**
 * Load all valid 5-letter words from the word-list package.
 * @returns Set of valid 5-letter words in uppercase.
 */
export function loadValidGuesses(): Set<string> {
  return new Set(getWordsOfLength(5));
}

/**
 * Load the list of possible answer words for Five Letter Word.
 * Uses the curated answer word list to avoid obscure words.
 * @returns Array of answer words in uppercase.
 */
export function loadAnswerWords(): string[] {
  return getAnswerWordsOfLength(5);
}

/**
 * Pick a random word from the answer word list.
 * @param answers Optional array of answer words (for testing).
 * @returns Random word from the list.
 */
export function pickRandomWord(answers?: string[]): string {
  return pickRandomWordOfLength(5, answers);
}
