import React, { useState } from 'react';
import { Panel } from '../../shared/components/Panel';
import { submitWord } from '../../shared/utils/api';
import '../../mindMatch/components/SubmitPanel.css';
import '../../undercovershared/undercovershared.css';
import '../../doubleBluff/doublebluff.css';

interface DoubleBluffSubmitPanelProps {
  playerId: string;
  accessKey: string;
  cluePhase: 1 | 2;
  isUndercover: boolean;
  hasSubmitted: boolean;
  submittedCount: number;
  totalCount: number;
  firstClues: string[];
}

/**
 * Panel for the simultaneous clue submission waves. Every player submits in
 * parallel; the agent sees the anonymous civilian first clues during wave 2.
 * @param props Submit panel props.
 * @returns Submit panel element.
 */
export function DoubleBluffSubmitPanel({
  playerId,
  accessKey,
  cluePhase,
  isUndercover,
  hasSubmitted,
  submittedCount,
  totalCount,
  firstClues,
}: DoubleBluffSubmitPanelProps) {
  const [wordInput, setWordInput] = useState('');
  const [status, setStatus] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('');

    if (!wordInput.trim()) {
      setStatus('Please enter a word.');
      return;
    }

    try {
      const { response, data } = await submitWord(playerId, wordInput.trim(), accessKey);
      if (!response.ok) {
        setStatus(
          data?.reason === 'duplicate_first_clue'
            ? 'You already submitted that word in the first round.'
            : 'Could not submit word.'
        );
        return;
      }
      setWordInput('');
    } catch {
      setStatus('Could not submit word.');
    }
  }

  return (
    <Panel title={`Submit Clue ${cluePhase} of 2`}>
      {!hasSubmitted && (
        <p className="undercover-turn-info undercover-turn-info--active">
          {isUndercover
            ? cluePhase === 1
              ? "Type something so you don't blow your cover! It won't be used."
              : "Craft a clue that fits with the civilians' first clues."
            : cluePhase === 1
              ? 'Enter your first clue.'
              : 'Enter your second clue.'}
        </p>
      )}
      {isUndercover && cluePhase === 2 && firstClues.length > 0 && (
        <div className="double-bluff-first-clues">
          <div className="double-bluff-first-clues-title">Civilians' first clues:</div>
          <ul>
            {firstClues.map((clue, i) => (
              <li key={i}>{clue}</li>
            ))}
          </ul>
        </div>
      )}
      {hasSubmitted ? (
        <p className="undercover-turn-info">
          You have submitted your clue. Waiting for others (
          {submittedCount}/{totalCount})...
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="submit-panel-form">
          <input
            type="text"
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
            placeholder="Your clue word..."
            className="submit-panel-input"
            maxLength={100}
          />
          <button type="submit" className="btn btn-primary">
            Submit
          </button>
        </form>
      )}

      {status && <p className="undercover-turn-info">{status}</p>}
    </Panel>
  );
}
