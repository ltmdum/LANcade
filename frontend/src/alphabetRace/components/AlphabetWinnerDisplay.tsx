import { Panel } from '../../shared/components/Panel';
import '../../alphabetRace/AlphabetRaceGame.css';

interface AlphabetWinnerDisplayProps {
  winnerNames: string[];
}

/**
 * Display the winner(s) for Alphabet Race with game over message.
 * Shows "It's a tie!" when multiple players share the highest score.
 * @param props Winner display props.
 * @returns Winner display element.
 */
export function AlphabetWinnerDisplay({ winnerNames }: AlphabetWinnerDisplayProps) {
  const isTie = winnerNames.length > 1;
  const headline = isTie ? "It's a tie!" : (winnerNames[0] || '-');

  return (
    <Panel title="Winner">
      <div className="alphabet-winner-name">{headline}</div>
      {isTie && (
        <div className="alphabet-winner-names">
          {winnerNames.map((name) => (
            <span key={name} className="alphabet-winner-names__name">{name}</span>
          ))}
        </div>
      )}
      <p className="alphabet-game-over">Game Over!</p>
    </Panel>
  );
}
