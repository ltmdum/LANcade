import { Panel } from '../../shared/components/Panel';
import { RoundResult } from '../../undercovershared/components/RoundResult';
import {
  RoundResultTable,
  resolveVoteTarget,
  type RoundResultRow,
} from '../../undercovershared/components/RoundResultTable';
import type { DoubleBluffSubmission, UndercoverVoteRound } from '@lancade/shared';

interface DoubleBluffResultDisplayProps {
  undercoverPlayerId: string;
  undercoverPlayerName: string;
  finishReason: string | null;
  finalGuess: string | null;
  submissions: DoubleBluffSubmission[];
  voteRounds: UndercoverVoteRound[];
  playerLookup: Record<string, string>;
  word: string | null;
}

/**
 * Round summary for Double Bluff: shows the agent, the secret word, the
 * outcome and every player's clue pair with the displayed clue highlighted,
 * plus who each player voted for in the deciding round.
 * @param props Result display props.
 * @returns Result display element.
 */
export function DoubleBluffResultDisplay({
  undercoverPlayerId,
  undercoverPlayerName,
  finishReason,
  finalGuess,
  submissions,
  voteRounds,
  playerLookup,
  word,
}: DoubleBluffResultDisplayProps) {
  const finalRound = voteRounds[voteRounds.length - 1];
  const rows: RoundResultRow[] = submissions.map((sub) => ({
    id: sub.playerId,
    name: sub.playerName,
    isUndercover: sub.playerId === undercoverPlayerId,
    clues: sub.clues.map((clue) => ({
      text: clue,
      displayed: clue === sub.displayedClue,
    })),
    votedFor: resolveVoteTarget(sub.playerId, finalRound, playerLookup),
  }));

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

      <RoundResultTable rows={rows} />
    </Panel>
  );
}
