import React from 'react';
import { Panel } from '../../shared/components/Panel';
import { LetterDisplay } from '../../shared/components/LetterDisplay';
import { PlayerScoreTags } from '../../shared/components/PlayerScoreTags';
import { CategoryWordInput } from './CategoryWordInput';
import './MulticatActivePanel.css';

interface MulticatActivePanelProps {
  letter: string | null;
  countdown: string;
  statusMessage: string;
  connection: string;
  myScore: number;
  isAdmin: boolean;
  isParticipating?: boolean;
  categories: string[];
  timeUp: boolean;
  acceptedByCategory: Map<string, string>;
  wordInputs: Record<string, string>;
  onInputChange: (category: string, value: string) => void;
  onWordSubmit: (category: string, e: React.FormEvent) => void;
  onNewLetter: () => void;
}

/**
 * Active round panel for Multicat gameplay.
 * @param props Active panel props.
 * @returns Active panel element.
 */
export function MulticatActivePanel({
  letter,
  countdown,
  statusMessage,
  connection,
  myScore,
  isAdmin,
  isParticipating = true,
  categories,
  timeUp,
  acceptedByCategory,
  wordInputs,
  onInputChange,
  onWordSubmit,
  onNewLetter,
}: MulticatActivePanelProps) {
  /**
   * Resolve the current input for a category.
   * @param category Category name.
   * @returns Current input string.
   */
  function getCurrentInput(category: string): string {
    const hasUserInput = category in wordInputs;
    const acceptedWord = acceptedByCategory.get(category);
    return hasUserInput ? wordInputs[category] : (acceptedWord ?? '');
  }

  return (
    <Panel className="categoryclash2-active-panel">
      {isParticipating && <PlayerScoreTags score={myScore} />}
      <LetterDisplay letter={letter} countdown={countdown} showCountdown />
      <div className="categoryclash2-status-message">{statusMessage}</div>
      <div className="categoryclash2-connection">{connection}</div>
      {isAdmin && (
        <button type="button" className="btn btn-secondary" onClick={onNewLetter}>
          New Letter
        </button>
      )}
      {isParticipating && (
        <div className="categoryclash2-categories">
          {categories.map((category) => (
            <CategoryWordInput
              key={category}
              category={category}
              currentInput={getCurrentInput(category)}
              acceptedWord={acceptedByCategory.get(category)}
              letter={letter}
              timeUp={timeUp}
              onInputChange={onInputChange}
              onSubmit={onWordSubmit}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}
