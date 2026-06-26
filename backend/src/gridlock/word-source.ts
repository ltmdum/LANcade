import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedWords: string[] | null = null;

/**
 * Load the bundled list of nine-letter seed words.
 * The list is generated from the open-source `word-list` package via
 * `scripts/generate-nine-letter-words.js`; every entry is a unique uppercase
 * nine-letter word.
 * @returns Array of uppercase nine-letter words.
 */
export function loadNineLetterWords(): string[] {
  if (cachedWords) {
    return cachedWords;
  }
  const wordListPath = path.join(__dirname, 'nine-letter-words.json');
  const content = fs.readFileSync(wordListPath, 'utf-8');
  cachedWords = JSON.parse(content) as string[];
  return cachedWords;
}

/**
 * Pick a random nine-letter seed word.
 * @param words Optional word list override (for testing).
 * @param rng Optional random source in the range [0, 1) (for testing).
 * @returns A random uppercase nine-letter word.
 */
export function pickRandomNineLetterWord(words?: string[], rng: () => number = Math.random): string {
  const list = words || loadNineLetterWords();
  return list[Math.floor(rng() * list.length)];
}
