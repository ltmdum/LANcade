import { Panel } from '../../shared/components/Panel';
import './WinnerDisplay.css';

interface WinnerDisplayProps {
  winnerNames: string[];
  scores: Record<string, number>;
  playerLookup: Record<string, string>;
}

/**
 * Display the game winner(s). Shows "It's a tie!" when multiple players win.
 * @param props Winner display props.
 * @returns Winner display element.
 */
export function WinnerDisplay({ winnerNames, scores, playerLookup }: WinnerDisplayProps) {
  const sortedScores = Object.entries(scores)
    .map(([id, score]) => ({ id, name: playerLookup[id] || 'Unknown', score }))
    .sort((a, b) => b.score - a.score);

  const isTie = winnerNames.length > 1;
  const headline = isTie ? "It's a tie!" : `${winnerNames[0]} wins!`;

  return (
    <Panel title="🏆 Game Over 🏆">
      <div className="winner-display">
        <div className="winner-name">{headline}</div>
        {isTie && (
          <div className="winner-names">
            {winnerNames.map((name) => (
              <span key={name} className="winner-names__name">{name}</span>
            ))}
          </div>
        )}
        <div className="final-scores">
          <h4>Final Scores</h4>
          {sortedScores.map(({ id, name, score }, index) => (
            <div
              key={id}
              className={`final-score ${winnerNames.includes(name) ? 'winner' : ''}`}
            >
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
