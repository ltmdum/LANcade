import React from 'react';
import { Panel } from '../../shared/components/Panel';
import { WordSubmitForm } from '../../shared/components/WordSubmitForm';
import '../../alphabetRace/AlphabetRaceGame.css';

interface RacingPanelProps {
  currentLetter: string | null;
  category: string | null;
  isEligible: boolean;
  isParticipating?: boolean;
  wordInput: string;
  statusMessage: string;
  submitStatus?: 'success' | 'error' | '';
  onWordInputChange: (value: string) => void;
  onWordSubmit: (e: React.FormEvent) => void;
}

/**
 * Racing phase panel for Alphabet Race.
 * Shows the current letter and word input for eligible players.
 * @param props Racing panel props.
 * @returns Racing panel element.
 */
export function RacingPanel({
  currentLetter,
  category,
  isEligible,
  isParticipating = true,
  wordInput,
  statusMessage,
  submitStatus = '',
  onWordInputChange,
  onWordSubmit,
}: RacingPanelProps) {
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
    </Panel>
  );
}
