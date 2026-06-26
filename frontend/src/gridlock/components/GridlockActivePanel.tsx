import React from 'react';
import { Panel } from '../../shared/components/Panel';
import { WordSubmitForm } from '../../shared/components/WordSubmitForm';
import { PlayerScoreTags } from '../../shared/components/PlayerScoreTags';
import { LetterGrid } from './LetterGrid';
import { AcceptedWordsList } from './AcceptedWordsList';
import './GridlockActivePanel.css';

interface AcceptedWord {
  id: string;
  word: string;
}

interface GridlockActivePanelProps {
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

/**
 * Active round panel for Gridlock gameplay.
 * @param props Active panel props.
 * @returns Active panel element.
 */
export function GridlockActivePanel({
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
}: GridlockActivePanelProps) {
  return (
    <Panel className="gridlock-active-panel">
      {isParticipating && <PlayerScoreTags playerName={playerName} score={myScore} />}
      <LetterGrid letters={letters} />
      <div className="gridlock-countdown">{countdown}</div>
      <div className="gridlock-status-message">{statusMessage}</div>
      {isAdmin && (
        <button type="button" className="btn btn-secondary" onClick={onNewGrid}>
          New Grid
        </button>
      )}
      <div className="gridlock-connection">{connection}</div>
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
