import React, { useState } from 'react';
import { Panel } from '../../shared/components/Panel';
import { submitWord } from '../../shared/utils/api';
import type { MindMatchSubmission } from '@lancade/shared';
import './SubmitPanel.css';

interface SubmitPanelProps {
  playerId: string;
  playerPassword: string;
  hasSubmitted: boolean;
  playerSubmission?: MindMatchSubmission;
}

/**
 * Panel for submitting a word during the round.
 * @param props Submit panel props.
 * @returns Submit panel element.
 */
export function SubmitPanel({
  playerId,
  playerPassword,
  hasSubmitted,
  playerSubmission,
}: SubmitPanelProps) {
  const [wordInput, setWordInput] = useState('');
  const [submittedWord, setSubmittedWord] = useState('');
  const [status, setStatus] = useState('');

  // Use server submission if available, otherwise use locally tracked word
  const displayWord = playerSubmission?.word || submittedWord;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('');

    if (!wordInput.trim()) {
      setStatus('Please enter a word.');
      return;
    }

    try {
      const { response, data } = await submitWord(playerId, wordInput, playerPassword);
      if (!response.ok) {
        setStatus(data.reason === 'empty' ? 'Please enter a word.' : 'Could not submit word.');
        return;
      }
      setSubmittedWord(wordInput.trim());
      setStatus('Submitted!');
      setWordInput('');
    } catch {
      setStatus('Could not submit word.');
    }
  }

  return (
    <Panel title="Your Answer">
      {hasSubmitted ? (
        <div className="submit-panel-submitted">
          <p>You submitted: <strong>{displayWord}</strong></p>
          <p className="submit-panel-hint">Waiting for other players to submit...</p>
        </div>
      ) : (
        <p className="submit-panel-hint">Enter a word that completes the phrase.</p>
      )}
      <form onSubmit={handleSubmit} className="submit-panel-form">
        <input
          type="text"
          value={wordInput}
          onChange={(e) => setWordInput(e.target.value)}
          placeholder="Your word..."
          className="submit-panel-input"
          maxLength={100}
        />
        <button type="submit" className="btn btn-primary">
          {hasSubmitted ? 'Update' : 'Submit'}
        </button>
      </form>
      {status && <p className="submit-panel-status">{status}</p>}
    </Panel>
  );
}
