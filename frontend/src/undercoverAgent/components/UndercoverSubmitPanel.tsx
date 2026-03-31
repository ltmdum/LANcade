import React, { useState } from 'react';
import { Panel } from '../../shared/components/Panel';
import { submitWord } from '../../shared/utils/api';

interface UndercoverSubmitPanelProps {
  playerId: string;
  playerPassword: string;
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
  playerPassword,
  isMyTurn,
  currentTurnPlayerName,
  currentRound,
  totalRounds,
  hasSubmittedThisRound,
}: UndercoverSubmitPanelProps) {
  const [wordInput, setWordInput] = useState('');
  const [status, setStatus] = useState('');

  /**
   * Handle form submission to send a clue word to the server.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('');

    if (!wordInput.trim()) {
      setStatus('Please enter a word.');
      return;
    }

    try {
      const { response, data } = await submitWord(playerId, wordInput.trim(), playerPassword);
      if (!response.ok) {
        setStatus(data.reason === 'empty' ? 'Please enter a word.' : 'Could not submit word.');
        return;
      }
      setStatus('Submitted!');
      setWordInput('');
    } catch {
      setStatus('Could not submit word.');
    }
  }

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
              onChange={(e) => setWordInput(e.target.value)}
              placeholder="Your clue word..."
              className="submit-panel-input"
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

      {status && <p className="undercover-turn-info">{status}</p>}
    </Panel>
  );
}
