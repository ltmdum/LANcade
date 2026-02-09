import { Panel } from '../../shared/components/Panel';
import './Leaderboard.css';

interface LeaderboardEntry {
  playerId: string;
  name: string;
  finalScore: number;
  totalSubmitted: number;
  rejected: number;
  votedOut: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentPlayerId: string;
}

/**
 * Render a leaderboard table for results.
 * @param props Leaderboard props.
 * @returns Leaderboard element.
 */
export function Leaderboard({ entries, currentPlayerId }: LeaderboardProps) {
  return (
    <Panel title="Leaderboard">
      <div className="results-table-container">
        <table className="results-table">
          <thead>
            <tr className="leaderboard-header-row">
              <th>Player</th>
              <th>Score</th>
              <th>Submitted</th>
              <th>Rejected</th>
              <th>Voted Out</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.playerId} className={entry.playerId === currentPlayerId ? 'highlight' : ''}>
                <td>{entry.name}</td>
                <td>{entry.finalScore}</td>
                <td>{entry.totalSubmitted}</td>
                <td>{entry.rejected}</td>
                <td>{entry.votedOut}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
