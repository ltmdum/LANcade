import { submitVotes as apiSubmitVotes } from './api';

/**
 * Result of a vote submission attempt.
 */
export interface VoteSubmissionResult {
  /** Whether the submission succeeded */
  success: boolean;
  /** Status message to display */
  statusMessage: string;
}

/**
 * Error messages for different rejection reasons.
 */
export interface VoteErrorMessages {
  /** Message when player is not eligible to vote */
  notEligible: string;
  /** Message when player has already voted */
  alreadyVoted: string;
  /** Generic failure message */
  failed: string;
}

/** Vote payload types supported by the API */
export type VotePayload = string[] | { decision: string };

/**
 * Configuration for vote submission.
 */
export interface VoteSubmitConfig {
  /** Player ID */
  playerId: string;
  /** Player password for authentication */
  playerPassword: string;
  /** Vote payload (array of word IDs or decision object) */
  payload: VotePayload;
  /** Error messages for different failure reasons */
  errorMessages: VoteErrorMessages;
  /** Success message to display */
  successMessage: string;
}

/**
 * Handle vote submission to the server.
 * @param config Vote configuration.
 * @returns Result with success status and message.
 */
export async function handleVoteSubmit(
  config: VoteSubmitConfig
): Promise<VoteSubmissionResult> {
  try {
    const { response, data } = await apiSubmitVotes(
      config.playerId,
      config.payload,
      config.playerPassword
    );

    if (!response.ok) {
      const msg = data.reason === 'not_participant' || data.reason === 'not_eligible'
        ? config.errorMessages.notEligible
        : data.reason === 'already_voted'
          ? config.errorMessages.alreadyVoted
          : config.errorMessages.failed;
      return {
        success: false,
        statusMessage: msg,
      };
    }

    return {
      success: true,
      statusMessage: config.successMessage,
    };
  } catch {
    return {
      success: false,
      statusMessage: config.errorMessages.failed,
    };
  }
}
