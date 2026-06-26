import { startRound } from './api';

/**
 * Result of a play again attempt.
 */
export interface PlayAgainResult {
  /** Whether the action succeeded */
  success: boolean;
  /** Status message to display */
  statusMessage: string;
}

/**
 * Handle starting a new round with the same duration.
 * @param durationMs Round duration in milliseconds.
 * @param accessKey Admin access key for authentication.
 * @returns Result with success status and message.
 */
export async function handlePlayAgain(
  durationMs: number,
  accessKey: string
): Promise<PlayAgainResult> {
  try {
    const { response } = await startRound(durationMs, accessKey);
    if (!response.ok) {
      return {
        success: false,
        statusMessage: 'Could not start the round.',
      };
    }
    return {
      success: true,
      statusMessage: 'Round started.',
    };
  } catch {
    return {
      success: false,
      statusMessage: 'Could not start the round.',
    };
  }
}
