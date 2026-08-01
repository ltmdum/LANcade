/**
 * Build the game-over winner message.
 * Shows "You won!" when the current player is the sole winner, "You and {name} won!"
 * on a shared win, and the winner names otherwise.
 * @param winnerNames Names of the winning player(s).
 * @param currentPlayerName Name of the current player, or null if unknown.
 * @returns The winner message with a celebratory emoji.
 */
export function buildWinnerMessage(winnerNames: string[], currentPlayerName: string | null): string {
  const names = winnerNames.filter(Boolean);
  if (names.length === 0) return '';
  const isCurrentPlayer = currentPlayerName !== null && names.includes(currentPlayerName);

  if (isCurrentPlayer && names.length === 1) {
    return 'You won! 🎉';
  }

  if (isCurrentPlayer) {
    const others = names.filter((name) => name !== currentPlayerName);
    return `You and ${others.join(' and ')} won! 🎉`;
  }

  if (names.length === 1) {
    return `${names[0]} wins! 👏`;
  }

  return `${names.join(' and ')} tie for the win! 👏`;
}
