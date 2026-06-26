import React, { useState } from 'react';
import { Panel } from '../../shared/components/Panel';
import { submitWord } from '../../shared/utils/api';

interface UndercoverGuessPanelProps {
  playerId: string;
  accessKey: string;
  isUndercover: boolean;
  undercoverPlayerName: string;
}

/**
 * Panel shown during the guessing phase after the undercover agent has been
 * correctly identified by unanimous vote. The agent gets one final chance to
 * guess the secret word. Civilians see a waiting message.
 * @param props Guess panel props.
 * @returns Guess panel element.
 */
export function UndercoverGuessPanel({
  playerId,
  accessKey,
  isUndercover,
  undercoverPlayerName,
}: UndercoverGuessPanelProps) {
  const [guessInput, setGuessInput] = useState('');
  const [status, setStatus] = useState('');

  /**
   * Handle the guess form submission.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('');

    if (!guessInput.trim()) {
      setStatus('Please enter your guess.');
      return;
    }

    try {
      const { response } = await submitWord(playerId, guessInput.trim(), accessKey);
      if (!response.ok) {
        setStatus('Could not submit guess.');
        return;
      }
      setStatus('Guess submitted!');
      setGuessInput('');
    } catch {
      setStatus('Could not submit guess.');
    }
  }

  if (!isUndercover) {
    return (
      <Panel title="Final Guess">
        <p className="undercover-turn-info">
          <strong>{undercoverPlayerName}</strong> has been identified as the
          Undercover Agent! They get one final chance to guess the secret word...
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Final Guess">
      <div className="undercover-role-box undercover-role-box--undercover">
        You have been identified! Guess the secret word to steal the win.
      </div>
      <form onSubmit={handleSubmit} className="submit-panel-form">
        <input
          type="text"
          value={guessInput}
          onChange={(e) => setGuessInput(e.target.value)}
          placeholder="Guess the secret word..."
          className="submit-panel-input"
          maxLength={100}
        />
        <button type="submit" className="btn btn-primary">
          Submit Guess
        </button>
      </form>
      {status && <p className="undercover-turn-info">{status}</p>}
    </Panel>
  );
}
