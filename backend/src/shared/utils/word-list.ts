import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cache = new Map<number, string[]>();

/**
 * Resolve the directory containing word-list JSON files.
 * In dev/prod the files live one level up in a data/ dir.
 * In the RN bundle the path is set via WORDS_DATA_DIR env var.
 * @returns Absolute path to the data directory.
 */
function getDataDir(): string {
  if (process.env.WORDS_DATA_DIR) {
    return process.env.WORDS_DATA_DIR;
  }
  return path.join(__dirname, '..', 'data');
}

/**
 * Load all words of a given length from the pre-built JSON files.
 * Words are cached after the first load.
 * @param length Exact number of letters to filter by.
 * @returns Array of unique uppercase words of the given length.
 */
export function getWordsOfLength(length: number): string[] {
  const cached = cache.get(length);
  if (cached) {
    return cached;
  }
  const dataPath = path.join(getDataDir(), `words-${length}.json`);
  const content = fs.readFileSync(dataPath, 'utf-8');
  const words = JSON.parse(content) as string[];
  cache.set(length, words);
  return words;
}

/**
 * Load the curated answer word list for a given length.
 * These are common words filtered from the full word list,
 * intended to be used as target/seed words (not for guess validation).
 * @param length Exact number of letters.
 * @returns Array of uppercase answer words.
 */
export function getAnswerWordsOfLength(length: number): string[] {
  const cached = cache.get(-length);
  if (cached) {
    return cached;
  }
  const dataPath = path.join(getDataDir(), `answer-words-${length}.json`);
  const content = fs.readFileSync(dataPath, 'utf-8');
  const words = JSON.parse(content) as string[];
  cache.set(-length, words);
  return words;
}

/**
 * Pick a random word of the given length.
 * @param length Exact number of letters.
 * @param words Optional word list override (for testing).
 * @param rng Optional random source in the range [0, 1) (for testing).
 * @returns A random uppercase word of the given length.
 */
export function pickRandomWordOfLength(
  length: number,
  words?: string[],
  rng: () => number = Math.random,
): string {
  const list = words || getWordsOfLength(length);
  return list[Math.floor(rng() * list.length)];
}
