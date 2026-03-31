import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GuessWords {
  guesses: string[];
  answers: string[];
}

let cachedWords: GuessWords | null = null;

/**
 * Load guess word lists from the bundled JSON file.
 * Words are sourced from guess-wordlist package (now deprecated).
 * @returns Object with guesses (all valid words) and answers (possible targets).
 */
function loadGuessWords(): GuessWords {
  if (cachedWords) {
    return cachedWords;
  }
  
  const wordListPath = path.join(__dirname, 'guess-words.json');
  const content = fs.readFileSync(wordListPath, 'utf-8');
  cachedWords = JSON.parse(content) as GuessWords;
  return cachedWords;
}

/**
 * Load all valid 5-letter words that can be guessed.
 * This includes both the answer words and additional valid guesses.
 * @returns Set of valid 5-letter words in uppercase.
 */
export function loadValidGuesses(): Set<string> {
  const { guesses, answers } = loadGuessWords();
  const words = new Set<string>();
  
  for (const word of guesses) {
    words.add(word.toUpperCase());
  }
  for (const word of answers) {
    words.add(word.toUpperCase());
  }
  
  return words;
}

/**
 * Load the list of possible answer words.
 * These are common 5-letter words that can be selected as targets.
 * @returns Array of answer words in uppercase.
 */
export function loadAnswerWords(): string[] {
  const { answers } = loadGuessWords();
  return answers.map((w) => w.toUpperCase());
}

/**
 * Pick a random word from the answer word list.
 * @param answers Optional array of answer words (for testing).
 * @returns Random word from the list.
 */
export function pickRandomWord(answers?: string[]): string {
  const wordList = answers || loadAnswerWords();
  return wordList[Math.floor(Math.random() * wordList.length)];
}
