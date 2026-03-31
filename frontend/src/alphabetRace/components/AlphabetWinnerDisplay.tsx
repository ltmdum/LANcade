import { Panel } from '../../shared/components/Panel';
import '../../alphabetRace/AlphabetRaceGame.css';

interface AlphabetWinnerDisplayProps {
  winnerName: string | null;
}

/**
 * Display the winner for Alphabet Race with game over message.
 * @param props Winner display props.
 * @returns Winner display element.
 */
export function AlphabetWinnerDisplay({ winnerName }: AlphabetWinnerDisplayProps) {
  return (
    <Panel title="Winner">
      <div className="alphabet-winner-name">{winnerName || '-'}</div>
      <p className="alphabet-game-over">Game Over!</p>
    </Panel>
  );
}
