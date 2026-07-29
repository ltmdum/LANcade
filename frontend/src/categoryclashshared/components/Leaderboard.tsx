import { Panel } from '../../shared/components/Panel';
import { buildPodiumFromScores, medalEmojiForPodium } from '@lancade/shared';
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
 * Detects ties when the top entries share the same finalScore.
 * @param props Leaderboard props.
 * @returns Leaderboard element.
 */
export function Leaderboard({ entries, currentPlayerId }: LeaderboardProps) {
  const isTie = entries.length >= 2 && entries[0].finalScore === entries[1].finalScore;
  const { podium, playerCount } = buildPodiumFromScores(entries.map(e => [e.name, e.finalScore]));

  return (
    <Panel title={isTie ? "It's a tie!" : 'Leaderboard'}>
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
                <td>{medalEmojiForPodium(podium, playerCount, entry.name)} {entry.name}</td>
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
