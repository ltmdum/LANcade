import React from 'react';
import { Panel } from '../../shared/components/Panel';
import { LetterDisplay } from '../../shared/components/LetterDisplay';
import { WordSubmitForm } from '../../shared/components/WordSubmitForm';
import { PlayerScoreTags } from '../../shared/components/PlayerScoreTags';
import './QuickFireActivePanel.css';

interface QuickFireActivePanelProps {
  letter: string | null;
  countdown: string;
  statusMessage: string;
  connection: string;
  playerName?: string;
  myScore: number;
  isAdmin: boolean;
  isParticipating?: boolean;
  timeUp: boolean;
  wordInput: string;
  onWordInputChange: (value: string) => void;
  onWordSubmit: (e: React.FormEvent) => void;
  onNewLetter: () => void;
}

/**
 * Active round panel for Quick Fire gameplay.
 * @param props Active panel props.
 * @returns Active panel element.
 */
export function QuickFireActivePanel({
  letter,
  countdown,
  statusMessage,
  connection,
  playerName,
  myScore,
  isAdmin,
  isParticipating = true,
  timeUp,
  wordInput,
  onWordInputChange,
  onWordSubmit,
  onNewLetter,
}: QuickFireActivePanelProps) {
  return (
    <Panel className="categoryclash1-active-panel">
      {isParticipating && <PlayerScoreTags playerName={playerName} score={myScore} />}
      <LetterDisplay letter={letter} countdown={countdown} showCountdown />
      <div className="categoryclash1-status-message">{statusMessage}</div>
      {isAdmin && (
        <button type="button" className="btn btn-secondary" onClick={onNewLetter}>
          New Letter
        </button>
      )}
      <div className="categoryclash1-connection">{connection}</div>
      {isParticipating && !timeUp && (
        <WordSubmitForm
          value={wordInput}
          onChange={onWordInputChange}
          onSubmit={onWordSubmit}
          letter={letter}
        />
      )}
    </Panel>
  );
}
