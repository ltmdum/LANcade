import { Panel } from '../../shared/components/Panel';
import { PlayAgainPanel } from '../../shared/components/PlayAgainPanel';
import { ScoreBoard } from '../../shared/components/ScoreBoard';
import { PlayerResults } from '../../categoryclashshared/components/PlayerResults';
import { buildWinnerMessage } from '../../shared/utils/winnerMessage';
import type { PlayerResult } from '@lancade/shared';

interface NineDashResultsProps {
  finalScores: Record<string, number>;
  players: { id: string; name: string }[];
  winnerNames: string[];
  winnerIds: string[];
  participants: string[];
  results: PlayerResult | null;
  playerName: string | null;
  sourceWord: string;
  isAdmin: boolean;
  actionStatus: string;
  onPlayAgain: () => void;
  onBackToConfig: () => void;
}

/** Results view for Nine Dash — winner, leaderboard, source word, play-again controls. */
export function NineDashResults({
  finalScores,
  players,
  winnerNames,
  winnerIds,
  participants,
  results,
  playerName,
  sourceWord,
  isAdmin,
  actionStatus,
  onPlayAgain,
  onBackToConfig,
}: NineDashResultsProps) {
  const hasResults = Object.keys(finalScores).length > 0;
  return (
    <>
      {sourceWord && (
        <Panel title="Hidden Word">
          <p className="ninedash-source-word">{sourceWord}</p>
        </Panel>
      )}
      {!hasResults ? (
        <Panel title="Results">
          <p>No results — nobody submitted any words this round.</p>
        </Panel>
      ) : (
        <>
          <div className="game-result-winner">
            {buildWinnerMessage(winnerNames, playerName)}
          </div>
          <ScoreBoard
            title="Final Scores"
            players={players.filter((p) => participants.includes(p.id))}
            scores={finalScores}
            winnerIds={winnerIds}
          />
          {results && <PlayerResults words={results.words} />}
        </>
      )}
      {isAdmin && (
        <PlayAgainPanel
          onPlayAgain={onPlayAgain}
          onBackToConfig={onBackToConfig}
          status={actionStatus}
        />
      )}
    </>
  );
}
