import { useState, useEffect } from 'react';
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
  const [showInstructions, setShowInstructions] = useState(false);

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
        <p className="game-info-description">{description}</p>
        <button
          type="button"
          className="game-info-toggle"
          onClick={() => setShowInstructions((v) => !v)}
          aria-expanded={showInstructions}
        >
          {showInstructions ? 'How to Play \u25B2' : 'How to Play \u25BC'}
        </button>
        {showInstructions && (
          <ul className="game-info-instructions">
            {instructions.map((step, i) => (
              <li key={i} className="game-info-step">
                <strong>{step.heading}:</strong> {step.text}
              </li>
            ))}
          </ul>
        )}
        <p className="game-info-docs-link">
          <a href={docsUrl} target="_blank" rel="noopener noreferrer">
            Tutorial &rarr;
          </a>
        </p>
      </div>
    </div>
  );
}
