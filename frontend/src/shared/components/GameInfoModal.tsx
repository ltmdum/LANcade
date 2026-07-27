import { useEffect } from 'react';
import './GameInfoModal.css';

interface GameInfoModalProps {
  name: string;
  description: string;
  instructions: { heading: string; text: string }[];
  gameId: string;
  onClose: () => void;
}

const DOCS_BASE = 'https://ltmdum.github.io/LANcade/games';

/**
 * Modal overlay showing game description and a link to full rules online.
 * @param props Modal props with game info, gameId, and close callback.
 * @returns Modal element.
 */
export function GameInfoModal({ name, description, instructions, gameId, onClose }: GameInfoModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const docsUrl = `${DOCS_BASE}/${gameId}.html`;

  return (
    <div className="game-info-overlay" onClick={onClose}>
      <div className="game-info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="game-info-header">
          <h2 className="game-info-title">{name}</h2>
          <button type="button" className="game-info-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="game-info-scroll">
          <p className="game-info-description">{description}</p>
          <h3 className="game-info-subtitle">How to Play</h3>
          <ul className="game-info-instructions">
            {instructions.map((step, i) => (
              <li key={i} className="game-info-step">
                <strong>{step.heading}:</strong> {step.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="game-info-footer">
          <a href={docsUrl} target="_blank" rel="noopener noreferrer">
            Online Tutorial
          </a>
        </div>
      </div>
    </div>
  );
}
