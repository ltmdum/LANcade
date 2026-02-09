/**
 * Result of checking player requirements for starting a game.
 */
export interface PlayerRequirementsResult {
  /** Whether the game can be started */
  canStart: boolean;
  /** Message to display when waiting for more players */
  waitingMessage?: string;
}

/**
 * Check if the player count meets the minimum requirement to start.
 * @param playerCount Current number of players.
 * @param minPlayers Minimum required players (defaults to 1).
 * @returns Result indicating if game can start and any waiting message.
 */
export function checkPlayerRequirements(
  playerCount: number,
  minPlayers: number | undefined
): PlayerRequirementsResult {
  const minimum = minPlayers ?? 1;

  if (playerCount < minimum) {
    return {
      canStart: false,
      waitingMessage: 'Waiting for more participants.',
    };
  }

  return { canStart: true };
}
