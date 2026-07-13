import React, { useState } from 'react';
import { Panel } from '../../shared/components/Panel';
import { LetterDisplay } from '../../shared/components/LetterDisplay';
import { WordSubmitForm } from '../../shared/components/WordSubmitForm';
import { PlayerScoreTags } from '../../shared/components/PlayerScoreTags';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
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
  submitStatus?: 'success' | 'error' | '';
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
  submitStatus = '',
  onWordInputChange,
  onWordSubmit,
  onNewLetter,
}: QuickFireActivePanelProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const statusClass = submitStatus ? `categoryclash1-status-message text-${submitStatus}` : 'categoryclash1-status-message';

  return (
    <Panel className="categoryclash1-active-panel">
      {isParticipating && <PlayerScoreTags playerName={playerName} score={myScore} />}
      <LetterDisplay letter={letter} countdown={countdown} showCountdown />
      <div className={statusClass}>{statusMessage}</div>
      {isAdmin && (
        <button type="button" className="btn btn-secondary" onClick={() => setShowConfirm(true)}>
          New Letter
        </button>
      )}
      <ConfirmDialog
        isOpen={showConfirm}
        title="New Letter?"
        message="Are you sure you want to start a new letter? This will reset the current round."
        confirmLabel="New Letter"
        onConfirm={() => { setShowConfirm(false); onNewLetter(); }}
        onCancel={() => setShowConfirm(false)}
      />
      <div className="categoryclash1-connection">{connection}</div>
      {isParticipating && !timeUp && (
        <WordSubmitForm
          value={wordInput}
          onChange={onWordInputChange}
          onSubmit={onWordSubmit}
          letter={letter}
          statusType={submitStatus || undefined}
        />
      )}
    </Panel>
  );
}
