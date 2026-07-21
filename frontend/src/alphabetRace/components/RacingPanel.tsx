import React, { useState } from 'react';
import { Panel } from '../../shared/components/Panel';
import { WordSubmitForm } from '../../shared/components/WordSubmitForm';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import '../../alphabetRace/AlphabetRaceGame.css';

interface RacingPanelProps {
  currentLetter: string | null;
  category: string | null;
  isEligible: boolean;
  isParticipating?: boolean;
  isAdmin?: boolean;
  wordInput: string;
  statusMessage: string;
  submitStatus?: 'success' | 'error' | '';
  onWordInputChange: (value: string) => void;
  onWordSubmit: (e: React.FormEvent) => void;
  onSkipLetter?: () => void;
}

/**
 * Racing phase panel for Alphabet Race.
 * Shows the current letter and word input for eligible players.
 * Admin sees a "Skip Letter" button with confirmation.
 * @param props Racing panel props.
 * @returns Racing panel element.
 */
export function RacingPanel({
  currentLetter,
  category,
  isEligible,
  isParticipating = true,
  isAdmin = false,
  wordInput,
  statusMessage,
  submitStatus = '',
  onWordInputChange,
  onWordSubmit,
  onSkipLetter,
}: RacingPanelProps) {
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const statusClass = submitStatus ? `alphabet-race-status text-${submitStatus}` : 'alphabet-race-status';

  return (
    <Panel>
      {category && <p className="alphabet-race-category">Category: {category}</p>}
      <div className="alphabet-race-letter">{currentLetter || '-'}</div>
      {statusMessage && <p className={statusClass}>{statusMessage}</p>}
      {isParticipating && (
        isEligible ? (
          <WordSubmitForm
            value={wordInput}
            onChange={onWordInputChange}
            onSubmit={onWordSubmit}
            letter={currentLetter}
            statusType={submitStatus || undefined}
          />
        ) : (
          <p className="alphabet-race-ineligible">
            You are sitting out this round. Waiting for submissions...
          </p>
        )
      )}
      {isAdmin && onSkipLetter && (
        <>
          <div className="alphabet-race-skip-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowSkipConfirm(true)}
            >
              Skip Letter
            </button>
          </div>
          <ConfirmDialog
            isOpen={showSkipConfirm}
            title="Skip Letter?"
            message={`Skip letter "${currentLetter}"? No points will be awarded. The game will advance to the next letter.`}
            confirmLabel="Skip Letter"
            cancelLabel="Cancel"
            danger
            onConfirm={() => {
              setShowSkipConfirm(false);
              onSkipLetter();
            }}
            onCancel={() => setShowSkipConfirm(false)}
          />
        </>
      )}
    </Panel>
  );
}
