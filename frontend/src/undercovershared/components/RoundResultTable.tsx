import '../undercovershared.css';
import type { UndercoverVoteRound } from '@lancade/shared';

export interface RoundResultClue {
  text: string;
  displayed: boolean;
}

export interface RoundResultRow {
  id: string;
  name: string;
  isUndercover: boolean;
  clues: RoundResultClue[];
  votedFor: string | null;
}

interface RoundResultTableProps {
  rows: RoundResultRow[];
}

/**
 * Player/clue summary table shown in round results. Includes a heading row and
 * a "Voted For" column, and scrolls horizontally when it overflows.
 * @param props Table props.
 * @returns The result table element.
 */
export function RoundResultTable({ rows }: RoundResultTableProps) {
  return (
    <div className="round-result-scroll">
      <table className="undercover-submissions-table round-result-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Clue</th>
            <th>Voted For</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{row.name}</strong>
                {row.isUndercover && (
                  <span className="undercover-agent-tag"> (Agent)</span>
                )}
              </td>
              <td>
                {row.clues.map((clue, i) => (
                  <span
                    key={i}
                    className={
                      clue.displayed
                        ? 'undercover-clue undercover-clue--displayed'
                        : 'undercover-clue'
                    }
                  >
                    {clue.text}
                  </span>
                ))}
              </td>
              <td>{row.votedFor ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Resolve the name a player voted for in the given round.
 * @param playerId The voter's player ID.
 * @param round The vote round to inspect, or undefined when none exists.
 * @param playerLookup Map of player ID to name.
 * @returns The voted-for name, or null when unavailable.
 */
export function resolveVoteTarget(
  playerId: string,
  round: UndercoverVoteRound | undefined,
  playerLookup: Record<string, string>
): string | null {
  if (!round) return null;
  const vote = round.votes.find((v) => v.playerId === playerId);
  if (!vote) return null;
  return playerLookup[vote.targetPlayerId] || vote.targetPlayerId;
}
