import { Panel } from '../../shared/components/Panel';
import { UndercoverWordList } from './UndercoverWordList';
import type { UndercoverSubmission } from '@lancade/shared';

interface UndercoverResultDisplayProps {
  undercoverPlayerId: string;
  undercoverPlayerName: string;
  finishReason: string | null;
  finalGuess: string | null;
  submissions: UndercoverSubmission[];
  word: string | null;
}

export function UndercoverResultDisplay({
  undercoverPlayerName,
  finishReason,
  finalGuess,
  submissions,
  word,
}: UndercoverResultDisplayProps) {
  return (
    <Panel title="Round Summary" className="undercover-result-panel">
      <div className="undercover-result-reveal">
        The Undercover Agent was: <strong>{undercoverPlayerName}</strong>
      </div>

      {word && (
        <div className="undercover-result-reveal">
          The secret word was: <strong>{word}</strong>
        </div>
      )}

      <RoundResult finishReason={finishReason} finalGuess={finalGuess} />

      <UndercoverWordList submissions={submissions} />
    </Panel>
  );
}

interface RoundResultProps {
  finishReason: string | null;
  finalGuess: string | null;
}

function RoundResult({ finishReason, finalGuess }: RoundResultProps) {
  const message = getRoundResultMessage(finishReason, finalGuess);
  if (!message) return null;

  return (
    <div className="undercover-result-reveal undercover-finish-reason">
      {message}
    </div>
  );
}

function getRoundResultMessage(finishReason: string | null, finalGuess: string | null): string | null {
  switch (finishReason) {
    case 'agent_found_word':
      return 'The Undercover Agent discovered the secret word and earns 2 points!';
    case 'civilian_revealed_word':
      return 'A Civilian submitted the secret word, earning the Agent 2 points!';
    case 'wrong_vote':
      return 'The Undercover Agent escaped detection and earns 3 points! Civilians who voted for the Agent earn 1 point.';
    case 'agent_final_guess_correct':
      return `The Undercover Agent correctly guessed the word${finalGuess ? `: "${finalGuess}"` : ''} and earns 1 point! Civilians who voted for the Agent earn 1 point.`;
    case 'agent_final_guess_wrong':
      return `The Undercover Agent guessed wrong${finalGuess ? ` ("${finalGuess}")` : ''}. Civilians who voted for the Agent earn 2 points, other civilians earn 1.`;
    default:
      return null;
  }
}
