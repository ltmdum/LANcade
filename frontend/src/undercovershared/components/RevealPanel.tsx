import { useState } from 'react';
import { Panel } from '../../shared/components/Panel';
import { submitWord } from '../../shared/utils/api';
import '../undercovershared.css';

interface RevealPanelProps {
  playerId: string;
  accessKey: string;
  hasRevealed: boolean;
  isUndercover: boolean;
  word: string | null;
  hasReadied: boolean;
}

/**
 * Panel for revealing the player's role (civilian or undercover).
 * After reveal, shows a ready button for the player.
 * @param props Reveal panel props.
 * @returns Reveal panel element.
 */
export function RevealPanel({
  playerId,
  accessKey,
  hasRevealed,
  isUndercover,
  word,
  hasReadied,
}: RevealPanelProps) {
  const [status, setStatus] = useState('');

  /**
   * Handle the reveal button click by calling the API.
   */
  async function handleReveal() {
    setStatus('');
    try {
      const { response } = await submitWord(playerId, 'REVEAL', accessKey);
      if (!response.ok) {
        setStatus('Could not reveal your role.');
      }
    } catch {
      setStatus('Could not reveal your role.');
    }
  }

  /**
   * Handle ready button click.
   */
  async function handleReady() {
    setStatus('');
    try {
      const { response } = await submitWord(playerId, 'READY', accessKey);
      if (!response.ok) {
        setStatus('Could not ready up.');
      }
    } catch {
      setStatus('Could not ready up.');
    }
  }

  if (!hasRevealed) {
    return (
      <Panel title="Your Role">
        <button className="btn btn-primary" onClick={handleReveal}>
          Reveal Your Role
        </button>
        {status && <p className="undercover-turn-info">{status}</p>}
      </Panel>
    );
  }

  return (
    <Panel title="Your Role">
      {isUndercover ? (
        <div className="undercover-role-box undercover-role-box--undercover">
          You are the Undercover Agent!
        </div>
      ) : (
        <div className="undercover-role-box undercover-role-box--civilian">
          <div>The word is:</div>
          <div className="undercover-word-display">{word}</div>
        </div>
      )}

      {hasReadied ? (
        <p className="undercover-turn-info">Waiting for other players...</p>
      ) : (
        <button className="btn btn-primary" onClick={handleReady}>
          Ready
        </button>
      )}

      {status && <p className="undercover-turn-info">{status}</p>}
    </Panel>
  );
}
