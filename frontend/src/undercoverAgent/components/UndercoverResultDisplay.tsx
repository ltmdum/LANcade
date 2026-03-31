import { Panel } from '../../shared/components/Panel';
import { UndercoverWordList } from './UndercoverWordList';
import type { UndercoverSubmission } from '@lancade/shared';

interface UndercoverResultDisplayProps {
  undercoverPlayerId: string;
  undercoverPlayerName: string;
  winnerIsUndercover: boolean;
  finishReason: string | null;
  finalGuess: string | null;
  submissions: UndercoverSubmission[];
  word: string | null;
}

/**
 * Display the final result of the Undercover Agent game.
 * Shows the undercover agent's identity, the secret word, and who won.
 * @param props Result display props.
 * @returns Result display element.
 */
export function UndercoverResultDisplay({
  undercoverPlayerName,
  winnerIsUndercover,
  finishReason,
  finalGuess,
  submissions,
  word,
}: UndercoverResultDisplayProps) {
  return (
    <Panel title="Game Over">
      <div className="undercover-result-reveal">
        The Undercover Agent was: <strong>{undercoverPlayerName}</strong>
      </div>

      {word && (
        <div className="undercover-result-reveal">
          The secret word was: <strong>{word}</strong>
        </div>
      )}

      <WinnerBanner winnerIsUndercover={winnerIsUndercover} />
      <FinishReasonDetail finishReason={finishReason} finalGuess={finalGuess} />

      <UndercoverWordList submissions={submissions} />
    </Panel>
  );
}

interface FinishReasonDetailProps {
  finishReason: string | null;
  finalGuess: string | null;
}

/**
 * Display contextual detail about how the game ended.
 * @param props Finish reason props.
 * @returns Finish reason element or null.
 */
function FinishReasonDetail({ finishReason, finalGuess }: FinishReasonDetailProps) {
  const message = getFinishReasonMessage(finishReason, finalGuess);
  if (!message) return null;

  return (
    <div className="undercover-result-reveal undercover-finish-reason">
      {message}
    </div>
  );
}

/**
 * Map a finish reason code to a human-readable message.
 * @param finishReason The reason code from the server.
 * @param finalGuess The agent's final guess, if any.
 * @returns Display message or null.
 */
function getFinishReasonMessage(finishReason: string | null, finalGuess: string | null): string | null {
  switch (finishReason) {
    case 'agent_found_word':
      return 'The Undercover Agent discovered the secret word!';
    case 'civilian_revealed_word':
      return 'A Civilian accidentally submitted the secret word!';
    case 'wrong_vote':
      return 'The Civilians voted for the wrong player!';
    case 'agent_final_guess_correct':
      return `The Undercover Agent correctly guessed the word${finalGuess ? `: "${finalGuess}"` : ''}!`;
    case 'agent_final_guess_wrong':
      return `The Undercover Agent guessed wrong${finalGuess ? ` ("${finalGuess}")` : ''} and failed to save themself.`;
    default:
      return null;
  }
}

interface WinnerBannerProps {
  winnerIsUndercover: boolean;
}

/**
 * Display a banner indicating which side won the game.
 * @param props Winner banner props.
 * @returns Winner banner element.
 */
function WinnerBanner({ winnerIsUndercover }: WinnerBannerProps) {
  if (winnerIsUndercover) {
    return (
      <div className="undercover-result-winner undercover-result-winner--undercover">
        The Undercover Agent wins!
      </div>
    );
  }

  return (
    <div className="undercover-result-winner undercover-result-winner--civilians">
      The Civilians win!
    </div>
  );
}
