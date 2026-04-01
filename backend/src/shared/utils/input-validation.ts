/**
 * Server-side input validation for user-provided strings.
 * All validation happens at the routing layer before data reaches game engines.
 */

const MAX_PLAYER_NAME_LENGTH = 30;
const MAX_WORD_LENGTH = 100;
const MAX_CATEGORY_LENGTH = 50;

interface ValidationOk {
  ok: true;
  value: string;
}

interface ValidationFail {
  ok: false;
  reason: string;
}

type ValidationResult = ValidationOk | ValidationFail;

/**
 * Validate a raw input as a non-empty trimmed string within a max length.
 * @param input Raw input value.
 * @param maxLength Maximum allowed length after trimming.
 * @param fieldName Human-readable field name for error messages.
 * @returns Validation result with the trimmed value or a reason string.
 */
function validateString(input: unknown, maxLength: number, fieldName: string): ValidationResult {
  if (typeof input !== 'string') {
    return { ok: false, reason: `${fieldName}_invalid_type` };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: `${fieldName}_empty` };
  }
  if (trimmed.length > maxLength) {
    return { ok: false, reason: 'input_too_long' };
  }
  return { ok: true, value: trimmed };
}

/**
 * Validate a player name.
 * @param name Raw name input.
 * @returns Validation result.
 */
export function validatePlayerName(name: unknown): ValidationResult {
  return validateString(name, MAX_PLAYER_NAME_LENGTH, 'name');
}

/**
 * Validate a submitted word.
 * @param word Raw word input.
 * @returns Validation result.
 */
export function validateWord(word: unknown): ValidationResult {
  return validateString(word, MAX_WORD_LENGTH, 'word');
}

/**
 * Validate a custom category name.
 * @param category Raw category input.
 * @returns Validation result.
 */
export function validateCategory(category: unknown): ValidationResult {
  return validateString(category, MAX_CATEGORY_LENGTH, 'category');
}
