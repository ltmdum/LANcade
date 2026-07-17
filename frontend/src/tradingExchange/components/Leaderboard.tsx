import type { TradingExchangeLeaderboardEntry } from '@lancade/shared';

interface LeaderboardProps {
  leaderboard: TradingExchangeLeaderboardEntry[];
  winnerIds: string[];
  trueValue: number | null;
  playerColours: Record<string, string>;
}

/**
 * Final game leaderboard showing full player names and P&L.
 * @param props Leaderboard props.
 * @returns Leaderboard element.
 */
export function Leaderboard({ leaderboard, winnerIds, trueValue, playerColours }: LeaderboardProps) {
  return (
    <div className="te-leaderboard">
      <h3 className="te-leaderboard__title">Final Results</h3>
      {trueValue !== null && (
        <p className="te-leaderboard__true-value">
          True Value: <strong>{trueValue}</strong>
        </p>
      )}
      {winnerIds.length > 1 && (
        <p className="te-leaderboard__tie">It's a tie!</p>
      )}
      <div className="te-leaderboard__list">
        {leaderboard.map((entry, i) => (
          <LeaderboardRow
            key={entry.playerId}
            rank={i + 1}
            entry={entry}
            colour={playerColours[entry.playerId] || 'inherit'}
            isWinner={winnerIds.includes(entry.playerId)}
          />
        ))}
      </div>
    </div>
  );
}

interface LeaderboardRowProps {
  rank: number;
  entry: TradingExchangeLeaderboardEntry;
  colour: string;
  isWinner: boolean;
}

function LeaderboardRow({ rank, entry, colour, isWinner }: LeaderboardRowProps) {
  const pnlClass = entry.pnl > 0
    ? 'te-pnl--positive'
    : entry.pnl < 0 ? 'te-pnl--negative' : '';

  return (
    <div className={`te-leaderboard__row ${isWinner ? 'te-leaderboard__row--winner' : ''}`}>
      <span className="te-leaderboard__rank">{rank}.</span>
      <span className="te-leaderboard__name" style={{ color: colour }}>
        {entry.playerName}
      </span>
      <span className={`te-leaderboard__pnl ${pnlClass}`}>
        {entry.pnl > 0 ? '+' : ''}{entry.pnl.toFixed(1)}
      </span>
    </div>
  );
}
