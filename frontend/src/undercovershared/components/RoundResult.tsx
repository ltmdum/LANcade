/**
 * Map a round finish reason to a player-facing summary message.
 * @param finishReason Reason the round ended.
 * @param finalGuess The agent's final guess when present.
 * @returns Message describing the round outcome, or null when unknown.
 */
function getRoundResultMessage(
  finishReason: string | null,
  finalGuess: string | null
): string | null {
  switch (finishReason) {
    case 'agent_found_word':
      return 'The Undercover Agent discovered the secret word!';
    case 'civilian_revealed_word':
      return 'The secret word was submitted by a civilian!';
    case 'wrong_vote':
      return 'The Undercover Agent escaped undetected!';
    case 'agent_final_guess_correct':
      return `The Undercover Agent guessed${finalGuess ? `: "${finalGuess}"` : ''} ✅`;
    case 'agent_final_guess_wrong':
      return `The Undercover Agent guessed${finalGuess ? `: "${finalGuess}"` : ''} ❌`;
    default:
      return null;
  }
}

interface RoundResultProps {
  finishReason: string | null;
  finalGuess: string | null;
}

export function RoundResult({ finishReason, finalGuess }: RoundResultProps) {
  const message = getRoundResultMessage(finishReason, finalGuess);
  if (!message) return null;

  return (
    <div className="undercover-result-reveal">
      {message}
    </div>
  );
}
