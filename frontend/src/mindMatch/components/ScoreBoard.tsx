import './ScoreBoard.css';

interface ScoreBoardProps {
  scores: Record<string, number>;
  playerLookup: Record<string, string>;
  winnerId: string | null;
  winningScore: number;
}

/**
 * Display current scores for all players.
 * @param props ScoreBoard props.
 * @returns ScoreBoard element.
 */
export function ScoreBoard({ scores, playerLookup, winnerId, winningScore }: ScoreBoardProps) {
  const sortedScores = Object.entries(scores)
    .map(([id, score]) => ({ id, name: playerLookup[id] || 'Unknown', score }))
    .sort((a, b) => b.score - a.score);

  const maxScore = sortedScores.length > 0 ? sortedScores[0].score : 0;

  return (
    <div className="scoreboard">
      <h3 className="scoreboard-title">Scores</h3>
      <div className="scoreboard-tags">
        {sortedScores.map(({ id, name, score }) => {
          let className = 'scoreboard-tag';
          if (id === winnerId) {
            className += ' winner';
          } else if (score === maxScore && score > 0) {
            className += ' leader';
          }
          return (
            <span key={id} className={className}>
              {name}: {score}
            </span>
          );
        })}
      </div>
      <div className="scoreboard-goal">First to {winningScore} wins!</div>
    </div>
  );
}
