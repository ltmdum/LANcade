import { useState } from 'react';
import { Panel } from '../../shared/components/Panel';
import { submitWord } from '../../shared/utils/api';
import { formatOrdinal } from '../../shared/utils/ordinal';
import './RevivalReadyPanel.css';

interface RevivalReadyPanelProps {
  playerId: string;
  accessKey: string;
  isBackIn: boolean;
  hasReadied: boolean;
  readyCount: number;
  totalCount: number;
  wordNumber: number | null;
}

/**
 * Ready panel shown after a round restart: every revived player must confirm
 * they are ready before the next letter is dealt.
 * @param props Ready panel props.
 * @returns Ready panel element.
 */
export function RevivalReadyPanel({
  playerId,
  accessKey,
  isBackIn,
  hasReadied,
  readyCount,
  totalCount,
  wordNumber,
}: RevivalReadyPanelProps) {
  const [status, setStatus] = useState('');

  /**
   * Send the READY command to the server.
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

  const restartText = wordNumber
    ? `Everyone failed to get their ${formatOrdinal(wordNumber)} word.`
    : 'Everyone failed to get a word through.';

  return (
    <Panel className="wordrush-ready-panel">
      <p className="wordrush-ready-message">{restartText}</p>
      {isBackIn ? (
        <>
          <p className="wordrush-ready-message wordrush-ready-back-in">You're back in!</p>
          {hasReadied ? (
            <p className="wordrush-ready-waiting">
              Waiting for other players to be ready... ({readyCount}/{totalCount})
            </p>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleReady}>
              Ready
            </button>
          )}
        </>
      ) : (
        <p className="wordrush-ready-waiting">
          Waiting for players to be ready... ({readyCount}/{totalCount})
        </p>
      )}
      {status && <p className="wordrush-ready-status">{status}</p>}
    </Panel>
  );
}
