import { Panel } from '../../shared/components/Panel';
import { PlayAgainPanel } from '../../shared/components/PlayAgainPanel';
import { Leaderboard } from '../../categoryclashshared/components/Leaderboard';
import { PlayerResultsTable } from '../../categoryclashshared/components/PlayerResultsTable';
import type { ScoreboardEntry } from '../../categoryclashshared/utils/scoreboard';
import type { PlayerResult } from '@lancade/shared';

interface GridlockResultsProps {
  scoreboard: ScoreboardEntry[];
  results: PlayerResult | null;
  playerId: string;
  isAdmin: boolean;
  actionStatus: string;
  onPlayAgain: () => void;
  onBackToConfig: () => void;
}

/**
 * Results view for Gridlock: the leaderboard, the player's own word results,
 * and admin play-again controls.
 * @param props Results props.
 * @returns Gridlock results element.
 */
export function GridlockResults({
  scoreboard,
  results,
  playerId,
  isAdmin,
  actionStatus,
  onPlayAgain,
  onBackToConfig,
}: GridlockResultsProps) {
  return (
    <>
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
