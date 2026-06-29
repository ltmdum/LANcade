import { canFormWordFromTiles } from '@lancade/shared';
import type { PreSubmitValidationResult } from '../../shared/utils/wordSubmission';

/**
 * Validate a Nine Dash word before submitting: it must be non-empty and use
 * only the available letter tiles (each tile at most once).
 * @param word The raw word input.
 * @param letters The available letter tiles.
 * @returns Validation result with the trimmed word or an error message.
 */
export function validateGridWord(word: string, letters: string[]): PreSubmitValidationResult {
  const trimmed = word.trim();
  if (!trimmed) {
    return { valid: false, errorMessage: "Type a word first." };
  }
  if (!canFormWordFromTiles(trimmed, letters)) {
    return { valid: false, errorMessage: "Word uses letters that are not on the grid." };
  }
  return { valid: true, trimmedWord: trimmed };
}
