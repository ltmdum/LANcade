import React, { useState } from 'react';
import { Panel } from '../../shared/components/Panel';
import { PromptDisplay } from './PromptDisplay';
import { submitWord } from '../../shared/utils/api';
import type { MindMatchSubmission, MindMatchPrompt, PlayerInfo } from '@lancade/shared';
import './SubmitPanel.css';

interface SubmitPanelProps {
  playerId: string;
  accessKey: string;
  hasSubmitted: boolean;
  playerSubmission?: MindMatchSubmission;
  prompt: MindMatchPrompt;
  players: PlayerInfo[];
  submittedPlayerIds: string[];
}

/**
 * Panel for submitting a word during the round.
 * @param props Submit panel props.
 * @returns Submit panel element.
 */
export function SubmitPanel({
  playerId,
  accessKey,
  hasSubmitted,
  playerSubmission,
  prompt,
  players,
  submittedPlayerIds,
}: SubmitPanelProps) {
  const [wordInput, setWordInput] = useState('');
  const [submittedWord, setSubmittedWord] = useState('');
  const [status, setStatus] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | ''>('');

  // Use server submission if available, otherwise use locally tracked word
  const displayWord = playerSubmission?.word || submittedWord;

  const waitingPlayers = players.filter(
    (p) => p.id !== playerId && !submittedPlayerIds.includes(p.id)
  );

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
      const { response, data } = await submitWord(playerId, wordInput, accessKey);
      if (!response.ok) {
        setStatus(data.reason === 'empty' ? 'Please enter a word.' : 'Could not submit word.');
        setSubmitStatus('error');
        return;
      }
      setSubmittedWord(wordInput.trim());
      setStatus('Submitted!');
      setSubmitStatus('success');
    } catch {
      setStatus('Could not submit word.');
      setSubmitStatus('error');
    }
  }

  function handleInputChange(value: string) {
    setWordInput(value);
    setSubmitStatus('');
  }

  if (hasSubmitted) {
    return (
      <Panel title="Your Answer">
        <PromptDisplay prompt={prompt} word={displayWord} />
        <p className="submit-panel-hint">Waiting for other players to submit...</p>
        {waitingPlayers.length > 0 && (
          <div className="submit-panel-waiting">
            <p className="submit-panel-waiting-label">Still waiting for:</p>
            <ul className="submit-panel-waiting-list">
              {waitingPlayers.map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    );
  }

  return (
    <Panel title="Your Answer">
      <PromptDisplay
        prompt={prompt}
        editable
        word={wordInput}
        onWordChange={handleInputChange}
      />
      <form onSubmit={handleSubmit} className="submit-panel-form">
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          Submit
        </button>
      </form>
      {status && <p className={`submit-panel-status${submitStatus ? ` text-${submitStatus}` : ''}`}>{status}</p>}
      {waitingPlayers.length > 0 && (
        <div className="submit-panel-waiting">
          <p className="submit-panel-waiting-label">Waiting for:</p>
          <ul className="submit-panel-waiting-list">
            {waitingPlayers.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
