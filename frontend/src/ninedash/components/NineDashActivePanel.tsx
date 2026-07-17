import React from 'react';
import { Panel } from '../../shared/components/Panel';
import { PlayerScoreTags } from '../../shared/components/PlayerScoreTags';
import { LetterGrid } from './LetterGrid';
import { AcceptedWordsList } from './AcceptedWordsList';
import './NineDashActivePanel.css';

interface AcceptedWord {
  id: string;
  word: string;
}

interface NineDashActivePanelProps {
  letters: string[];
  countdown: string;
  statusMessage: string;
  connection: string;
  playerName?: string;
  myScore: number;
  myWords: AcceptedWord[];
  isParticipating?: boolean;
  timeUp: boolean;
  wordInput: string;
  selectedIndices: number[];
  submitStatus?: 'success' | 'error' | '';
  inputHint?: string;
  onTileClick: (index: number) => void;
  onBackspace: () => void;
  onClear: () => void;
  onInputClick: () => void;
  onWordSubmit: (e: React.FormEvent) => void;
}

/** Active play panel for Nine Dash — letter grid, word input, score. */
export function NineDashActivePanel({
  letters,
  countdown,
  statusMessage,
  connection,
  playerName,
  myScore,
  myWords,
  isParticipating = true,
  timeUp,
  wordInput,
  selectedIndices,
  submitStatus = '',
  inputHint,
  onTileClick,
  onBackspace,
  onClear,
  onInputClick,
  onWordSubmit,
}: NineDashActivePanelProps) {
  const statusClass = submitStatus ? `ninedash-status-message text-${submitStatus}` : 'ninedash-status-message';
  const inputClass = `ninedash-input${submitStatus === 'success' ? ' ninedash-input-success' : ''}${submitStatus === 'error' ? ' ninedash-input-error' : ''}`;

  return (
    <Panel className="ninedash-active-panel">
      {isParticipating && <PlayerScoreTags playerName={playerName} score={myScore} />}
      <LetterGrid
        letters={letters}
        selectedIndices={selectedIndices}
        onTileClick={isParticipating && !timeUp ? onTileClick : undefined}
      />
      <div className="ninedash-countdown">{countdown}</div>
      <div className={statusClass}>{statusMessage}</div>
      <div className="ninedash-connection">{connection}</div>
      {isParticipating && !timeUp && (
        <form onSubmit={onWordSubmit} className="ninedash-input-form">
          <div className="ninedash-input-row">
            <input
              type="text"
              className={inputClass}
              value={wordInput}
              readOnly
              placeholder="Tap letters to make a word"
              maxLength={100}
              onClick={onInputClick}
            />
            <button
              type="button"
              className="ninedash-backspace"
              onClick={onBackspace}
              disabled={wordInput.length === 0}
              aria-label="Backspace"
            >
              ⌫
            </button>
          </div>
          {inputHint && <div className="ninedash-input-hint">{inputHint}</div>}
          <div className="ninedash-button-row">
            <button
              type="button"
              className="btn ninedash-btn-clear"
              onClick={onClear}
              disabled={wordInput.length === 0}
            >
              Clear
            </button>
            <button
              type="submit"
              className="btn btn-primary ninedash-btn-submit"
              disabled={wordInput.length === 0}
            >
              Submit
            </button>
          </div>
        </form>
      )}
      {isParticipating && <AcceptedWordsList words={myWords} />}
    </Panel>
  );
}
