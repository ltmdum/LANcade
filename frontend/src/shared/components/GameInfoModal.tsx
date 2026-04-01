import { useEffect } from 'react';
import './GameInfoModal.css';

interface GameInfoModalProps {
  name: string;
  description: string;
  instructions: string[];
  onClose: () => void;
}

/**
 * Modal overlay showing game description and instructions.
 * @param props Modal props with game info and close callback.
 * @returns Modal element.
 */
export function GameInfoModal({ name, description, instructions, onClose }: GameInfoModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="game-info-overlay" onClick={onClose}>
      <div className="game-info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="game-info-header">
          <h2 className="game-info-title">{name}</h2>
          <button type="button" className="game-info-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <p className="game-info-description">{description}</p>
        <h3 className="game-info-subtitle">How to Play</h3>
        <ol className="game-info-instructions">
          {instructions.map((step, i) => (
            <li key={i} className="game-info-step">{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
