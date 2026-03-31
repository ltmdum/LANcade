import { Panel } from '../../shared/components/Panel';
import './WinnerDisplay.css';

interface WinnerDisplayProps {
  winnerName: string;
}

/**
 * Display the winner name for WordRush.
 * @param props Winner display props.
 * @returns Winner display element.
 */
export function WinnerDisplay({ winnerName }: WinnerDisplayProps) {
  return (
    <Panel title="Winner">
      <div className="winner-display">
        {winnerName || '-'}
      </div>
    </Panel>
  );
}
