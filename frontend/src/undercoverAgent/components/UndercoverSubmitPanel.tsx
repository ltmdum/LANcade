import React, { useState, useEffect } from 'react';
import { Panel } from '../../shared/components/Panel';
import { submitWord } from '../../shared/utils/api';
import '../../mindMatch/components/SubmitPanel.css';

interface UndercoverSubmitPanelProps {
  playerId: string;
  accessKey: string;
  isMyTurn: boolean;
  currentTurnPlayerName: string;
  currentRound: number;
  totalRounds: number;
  hasSubmittedThisRound: boolean;
}

/**
 * Panel for submitting a clue word during the submission phase.
 * Shows turn information and an input form when it is the player's turn.
 * @param props Submit panel props.
 * @returns Submit panel element.
 */
export function UndercoverSubmitPanel({
  playerId,
  accessKey,
  isMyTurn,
  currentTurnPlayerName,
  currentRound,
  totalRounds,
  hasSubmittedThisRound,
}: UndercoverSubmitPanelProps) {
  const [wordInput, setWordInput] = useState('');
  const [status, setStatus] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    setStatus('');
    setSubmitStatus('');
  }, [currentRound]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('');
    setSubmitStatus('');

    if (!wordInput.trim()) {
      setStatus('Please enter a word.');
      setSubmitStatus('error');
      return;
    }

    try {
      const { response, data } = await submitWord(playerId, wordInput.trim(), accessKey);
      if (!response.ok) {
        setStatus(data.reason === 'empty' ? 'Please enter a word.' : 'Could not submit word.');
        setSubmitStatus('error');
        return;
      }
      setStatus('Submitted!');
      setSubmitStatus('success');
      setWordInput('');
    } catch {
      setStatus('Could not submit word.');
      setSubmitStatus('error');
    }
  }

  function handleInputChange(value: string) {
    setWordInput(value);
    setSubmitStatus('');
  }

  const inputClass = `submit-panel-input${submitStatus === 'success' ? ' submit-panel-input-success' : ''}${submitStatus === 'error' ? ' submit-panel-input-error' : ''}`;
  const statusClass = `undercover-turn-info${submitStatus ? ` text-${submitStatus}` : ''}`;

  return (
    <Panel title="Submit a Clue">
      <p className="undercover-round-info">
        Round {currentRound} of {totalRounds}
      </p>

      {hasSubmittedThisRound ? (
        <p className="undercover-turn-info">
          You have submitted your clue this round. Waiting for others...
        </p>
      ) : isMyTurn ? (
        <div>
          <p className="undercover-turn-info undercover-turn-info--active">
            It's your turn! Submit a one-word clue.
          </p>
          <form onSubmit={handleSubmit} className="submit-panel-form">
            <input
              type="text"
              value={wordInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Your clue word..."
              className={inputClass}
              maxLength={100}
            />
            <button type="submit" className="btn btn-primary">
              Submit
            </button>
          </form>
        </div>
      ) : (
        <p className="undercover-turn-info">
          Waiting for <strong>{currentTurnPlayerName}</strong> to submit...
        </p>
      )}

      {status && <p className={statusClass}>{status}</p>}
    </Panel>
  );
}
