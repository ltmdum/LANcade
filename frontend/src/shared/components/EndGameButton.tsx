import { useState } from 'react';
import { handleEndGame } from '../utils/endGameActions';
import './EndGameButton.css';

interface EndGameButtonProps {
  adminSessionId: string;
  onExpired: () => void;
  onEnded?: () => void;
}

/**
 * Button to end the current game early, with confirmation popup.
 * This is a shared component that works for all games.
 * @param props End game button props.
 * @returns End game button element.
 */
export function EndGameButton({
  adminSessionId,
  onExpired,
  onEnded,
}: EndGameButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [status, setStatus] = useState('');
  const [isEnding, setIsEnding] = useState(false);

  /**
   * Handle the end game button click.
   */
  function handleClick() {
    setStatus('');
    setShowConfirmation(true);
  }

  /**
   * Handle cancel in the confirmation popup.
   */
  function handleCancel() {
    setShowConfirmation(false);
    setStatus('');
  }

  /**
   * Handle confirm in the confirmation popup.
   */
  async function handleConfirm() {
    const result = await handleEndGame({
      adminSessionId,
      setShowConfirmation,
      setStatus,
      setIsEnding,
      onExpired,
      onEnded,
    });

    if (!result.success && result.statusMessage) {
      setStatus(result.statusMessage);
    }
  }

  return (
    <div className="end-game-container">
      <button
        type="button"
        className="btn btn-danger end-game-button"
        onClick={handleClick}
        disabled={!adminSessionId || isEnding}
      >
        End Game
      </button>
      {status && <p className="end-game-status">{status}</p>}

      {showConfirmation && (
        <div className="end-game-overlay" onClick={handleCancel}>
          <div className="end-game-popup" onClick={(e) => e.stopPropagation()}>
            <h3 className="end-game-popup-title">End Game?</h3>
            <p className="end-game-popup-message">
              Are you sure you want to end the current game? This action cannot be undone.
            </p>
            <div className="end-game-popup-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={isEnding}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirm}
                disabled={isEnding}
              >
                {isEnding ? 'Ending...' : 'End Game'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
