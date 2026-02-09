import { submitWord as apiSubmitWord } from './api';

/**
 * Result of pre-submit word validation.
 */
export interface PreSubmitValidationResult {
  /** Whether the word is valid for submission */
  valid: boolean;
  /** The trimmed word (only set when valid) */
  trimmedWord?: string;
  /** Error message to display (only set when invalid) */
  errorMessage?: string;
}

/**
 * Validate a word before submitting to the server.
 * Checks that the word starts with the expected letter.
 * @param word The raw word input.
 * @param letter The expected starting letter.
 * @returns Validation result with trimmed word or error message.
 */
export function validateWordForSubmit(word: string, letter: string): PreSubmitValidationResult {
  const trimmed = word.trim();
  
  if (trimmed[0].toUpperCase() !== letter.toUpperCase()) {
    return {
      valid: false,
      errorMessage: `Word must start with ${letter}.`,
    };
  }

  return {
    valid: true,
    trimmedWord: trimmed,
  };
}

/**
 * Result of a word submission attempt.
 */
export interface WordSubmissionResult {
  /** Whether the submission succeeded */
  success: boolean;
  /** Status message to display */
  statusMessage: string;
}

/**
 * Configuration for word submission handling.
 */
export interface WordSubmissionConfig {
  /** Player ID */
  playerId: string;
  /** Player password for authentication */
  playerPassword: string;
  /** The expected starting letter */
  letter: string;
  /** Optional category for multi-category games */
  category?: string;
}

/**
 * Handles the full word submission flow: validation, API call, and response handling.
 * @param word The raw word input.
 * @param config Submission configuration.
 * @returns Result with success status and message.
 */
export async function handleWordSubmission(
  word: string,
  config: WordSubmissionConfig
): Promise<WordSubmissionResult> {
  const validation = validateWordForSubmit(word, config.letter);
  if (!validation.valid) {
    return {
      success: false,
      statusMessage: validation.errorMessage!,
    };
  }

  try {
    const { response, data } = await apiSubmitWord(
      config.playerId,
      validation.trimmedWord!,
      config.playerPassword,
      config.category
    );

    if (!response.ok) {
      const msg = data.reason === 'already_used_by_self'
        ? `Honk! You've already used ${data.blockedWord} for ${data.blockedCategory}, you silly goose!`
        : data.reason === 'duplicate'
          ? `Already used by ${data.blockedByName || 'another player'}.`
          : data.reason === 'invalid_letter'
            ? `Word must start with ${config.letter}.`
            : data.reason === 'time_up'
              ? 'Time is up.'
              : 'Word rejected.';
      return {
        success: false,
        statusMessage: msg,
      };
    }

    return {
      success: true,
      statusMessage: 'Accepted.',
    };
  } catch {
    return {
      success: false,
      statusMessage: 'Unable to submit.',
    };
  }
}
