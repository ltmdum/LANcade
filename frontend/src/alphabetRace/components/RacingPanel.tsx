import React from 'react';
import { Panel } from '../../shared/components/Panel';
import { WordSubmitForm } from '../../shared/components/WordSubmitForm';
import '../../alphabetRace/AlphabetRaceGame.css';

interface RacingPanelProps {
  currentLetter: string | null;
  category: string | null;
  isEligible: boolean;
  wordInput: string;
  statusMessage: string;
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
  wordInput,
  statusMessage,
  onWordInputChange,
  onWordSubmit,
}: RacingPanelProps) {
  return (
    <Panel>
      {category && <p className="alphabet-race-category">Category: {category}</p>}
      <div className="alphabet-race-letter">{currentLetter || '-'}</div>
      {statusMessage && <p className="alphabet-race-status">{statusMessage}</p>}
      {isEligible ? (
        <WordSubmitForm
          value={wordInput}
          onChange={onWordInputChange}
          onSubmit={onWordSubmit}
          letter={currentLetter}
        />
      ) : (
        <p className="alphabet-race-ineligible">
          You are sitting out this round. Waiting for submissions...
        </p>
      )}
    </Panel>
  );
}
