/**
 * Letter match status for Guess-style feedback.
 */
export type LetterStatus = 'correct' | 'present' | 'absent';

/**
 * Result of evaluating a guessed word against the target.
 */
export interface GuessResult {
  letters: LetterStatus[];
  correctCount: number;
  presentCount: number;
}

/**
 * Evaluate a guess against the target word.
 * @param guess The guessed word (uppercase).
 * @param target The target word (uppercase).
 * @returns Evaluation result with letter statuses and counts.
 */
export function evaluateGuess(guess: string, target: string): GuessResult {
  const guessArr = guess.split('');
  const targetArr = target.split('');
  const letters: LetterStatus[] = new Array(5).fill('absent');
  const targetUsed: boolean[] = new Array(5).fill(false);

  // First pass: mark correct letters
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === targetArr[i]) {
      letters[i] = 'correct';
      targetUsed[i] = true;
    }
  }

  // Second pass: mark present letters
  for (let i = 0; i < 5; i++) {
    if (letters[i] === 'correct') continue;
    for (let j = 0; j < 5; j++) {
      if (!targetUsed[j] && guessArr[i] === targetArr[j]) {
        letters[i] = 'present';
        targetUsed[j] = true;
        break;
      }
    }
  }

  const correctCount = letters.filter((s) => s === 'correct').length;
  const presentCount = letters.filter((s) => s === 'present').length;

  return { letters, correctCount, presentCount };
}
