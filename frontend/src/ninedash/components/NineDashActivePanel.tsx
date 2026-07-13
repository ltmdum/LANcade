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
  isParticipating?: boolean;
  timeUp: boolean;
  wordInput: string;
  submitStatus?: 'success' | 'error' | '';
  onWordInputChange: (value: string) => void;
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
  submitStatus = '',
  onWordInputChange,
  onWordSubmit,
}: NineDashActivePanelProps) {
  const statusClass = submitStatus ? `ninedash-status-message text-${submitStatus}` : 'ninedash-status-message';

  return (
    <Panel className="ninedash-active-panel">
      {isParticipating && <PlayerScoreTags playerName={playerName} score={myScore} />}
      <LetterGrid letters={letters} />
      <div className="ninedash-countdown">{countdown}</div>
      <div className={statusClass}>{statusMessage}</div>
      <div className="ninedash-connection">{connection}</div>
      {isParticipating && !timeUp && (
        <WordSubmitForm
          value={wordInput}
          onChange={onWordInputChange}
          onSubmit={onWordSubmit}
          letter={null}
          placeholder="Make a word from the tiles"
          statusType={submitStatus || undefined}
        />
      )}
      {isParticipating && <AcceptedWordsList words={myWords} />}
    </Panel>
  );
}
