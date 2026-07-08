import { Panel } from '../../shared/components/Panel';
import './WinnerDisplay.css';

interface WinnerDisplayProps {
  winnerName: string;
  scores: Record<string, number>;
  playerLookup: Record<string, string>;
}

/**
 * Display the game winner.
 * @param props Winner display props.
 * @returns Winner display element.
 */
export function WinnerDisplay({ winnerName, scores, playerLookup }: WinnerDisplayProps) {
  const sortedScores = Object.entries(scores)
    .map(([id, score]) => ({ id, name: playerLookup[id] || 'Unknown', score }))
    .sort((a, b) => b.score - a.score);

  return (
    <Panel title="🏆 Game Over 🏆">
      <div className="winner-display">
        <div className="winner-name">{winnerName} wins!</div>
        <div className="final-scores">
          <h4>Final Scores</h4>
          {sortedScores.map(({ id, name, score }, index) => (
            <div key={id} className={`final-score ${index === 0 ? 'winner' : ''}`}>
              <span className="final-score-rank">{index + 1}. </span>
              <span className="final-score-name">{name}</span>
              <span className="final-score-value">{score}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
