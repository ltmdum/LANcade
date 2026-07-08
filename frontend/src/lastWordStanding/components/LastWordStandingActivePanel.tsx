import React from 'react';
import { Panel } from '../../shared/components/Panel';
import { LetterDisplay } from '../../shared/components/LetterDisplay';
import { WordSubmitForm } from '../../shared/components/WordSubmitForm';
import './LastWordStandingActivePanel.css';

interface LastWordStandingActivePanelProps {
  playerName: string;
  currentPlayerName: string;
  lastChance: boolean;
  letter: string | null;
  countdown: string;
  statusMessage: string;
  connection: string;
  isCurrentPlayer: boolean;
  isEliminated: boolean;
  isParticipating?: boolean;
  wordInput: string;
  submitStatus?: 'success' | 'error' | '';
  onWordInputChange: (value: string) => void;
  onWordSubmit: (e: React.FormEvent) => void;
}

/**
 * Active turn panel for Last Word Standing.
 * @param props Active panel props.
 * @returns Active panel element.
 */
export function LastWordStandingActivePanel({
  playerName,
  currentPlayerName,
  lastChance,
  letter,
  countdown,
  statusMessage,
  connection,
  isCurrentPlayer,
  isEliminated,
  isParticipating = true,
  wordInput,
  submitStatus = '',
  onWordInputChange,
  onWordSubmit,
}: LastWordStandingActivePanelProps) {
  const statusClass = submitStatus ? `wordrush-active-status text-${submitStatus}` : 'wordrush-active-status';

  return (
    <Panel className="wordrush-active-panel">
      <div className="wordrush-active-tags">
        {isParticipating && <span className="tag">Player: {playerName}</span>}
        <span className="tag">Current Turn: {currentPlayerName}</span>
        {lastChance && <span className="tag wordrush-active-last-chance">Last Chance</span>}
      </div>
      <LetterDisplay letter={letter} countdown={countdown} showCountdown />
      <div className={statusClass}>{statusMessage}</div>
      <div className="wordrush-active-connection">{connection}</div>
      {isParticipating && isCurrentPlayer && !isEliminated && (
        <WordSubmitForm
          value={wordInput}
          onChange={onWordInputChange}
          onSubmit={onWordSubmit}
          letter={letter}
          statusType={submitStatus || undefined}
        />
      )}
      {isParticipating && isEliminated && (
        <p className="wordrush-active-eliminated">
          You are out. Watching the rest of the game.
        </p>
      )}
    </Panel>
  );
}
