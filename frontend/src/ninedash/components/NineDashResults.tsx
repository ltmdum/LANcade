import { Panel } from '../../shared/components/Panel';
import { PlayAgainPanel } from '../../shared/components/PlayAgainPanel';
import { Leaderboard } from '../../categoryclashshared/components/Leaderboard';
import { PlayerResultsTable } from '../../categoryclashshared/components/PlayerResultsTable';
import type { ScoreboardEntry } from '../../categoryclashshared/utils/scoreboard';
import type { PlayerResult } from '@lancade/shared';

interface NineDashResultsProps {
  scoreboard: ScoreboardEntry[];
  results: PlayerResult | null;
  playerId: string;
  sourceWord: string;
  isAdmin: boolean;
  actionStatus: string;
  onPlayAgain: () => void;
  onBackToConfig: () => void;
}

/** Results view for Nine Dash — leaderboard, source word, play-again controls. */
export function NineDashResults({
  scoreboard,
  results,
  playerId,
  sourceWord,
  isAdmin,
  actionStatus,
  onPlayAgain,
  onBackToConfig,
}: NineDashResultsProps) {
  return (
    <>
      {sourceWord && (
        <Panel title="Hidden Word">
          <p className="ninedash-source-word">{sourceWord}</p>
        </Panel>
      )}
      {scoreboard.length === 0 ? (
        <Panel title="Results">
          <p>No results — nobody submitted any words this round.</p>
        </Panel>
      ) : (
        <>
          <Leaderboard entries={scoreboard} currentPlayerId={playerId} />
          {results && <PlayerResultsTable words={results.words} />}
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
