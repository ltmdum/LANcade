import React from 'react';
import { Panel } from '../../shared/components/Panel';
import { WordSubmitForm } from '../../shared/components/WordSubmitForm';
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
  isAdmin: boolean;
  isParticipating?: boolean;
  timeUp: boolean;
  wordInput: string;
  onWordInputChange: (value: string) => void;
  onWordSubmit: (e: React.FormEvent) => void;
  onNewGrid: () => void;
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
  isAdmin,
  isParticipating = true,
  timeUp,
  wordInput,
  onWordInputChange,
  onWordSubmit,
  onNewGrid,
}: NineDashActivePanelProps) {
  return (
    <Panel className="ninedash-active-panel">
      {isParticipating && <PlayerScoreTags playerName={playerName} score={myScore} />}
      <LetterGrid letters={letters} />
      <div className="ninedash-countdown">{countdown}</div>
      <div className="ninedash-status-message">{statusMessage}</div>
      {isAdmin && (
        <button type="button" className="btn btn-secondary" onClick={onNewGrid}>
          New Grid
        </button>
      )}
      <div className="ninedash-connection">{connection}</div>
      {isParticipating && !timeUp && (
        <WordSubmitForm
          value={wordInput}
          onChange={onWordInputChange}
          onSubmit={onWordSubmit}
          letter={null}
          placeholder="Make a word from the tiles"
        />
      )}
      {isParticipating && <AcceptedWordsList words={myWords} />}
    </Panel>
  );
}
