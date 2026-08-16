import { Panel } from './Panel';
import './PlayAgainPanel.css';

interface PlayAgainPanelProps {
  onPlayAgain: () => void;
  onBackToConfig: () => void;
  status?: string;
  title?: string;
}

/**
 * Panel with actions to play again or return to config.
 * @param props Play again panel props.
 * @returns Play again panel element.
 */
export function PlayAgainPanel({
  onPlayAgain,
  onBackToConfig,
  status,
  title = 'Next Round',
}: PlayAgainPanelProps) {
  return (
    <Panel title={title}>
      <div className="play-again-actions">
        <button type="button" className="btn btn-primary" onClick={onPlayAgain}>
          Play Again
        </button>
        <button type="button" className="btn btn-secondary" onClick={onBackToConfig}>
          Back to Menu
        </button>
      </div>
      {status && <p className="play-again-status">{status}</p>}
    </Panel>
  );
}
