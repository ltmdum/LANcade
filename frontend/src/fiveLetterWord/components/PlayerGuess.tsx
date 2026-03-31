import { useMemo } from 'react';
import type { PlayerGameState, RowBestResult, LetterStatus } from '@lancade/shared';
import { GuessGrid } from './GuessGrid';
import { WordInput } from './WordInput';

interface PlayerGuessProps {
  playerState: PlayerGameState | undefined;
  rowBests: RowBestResult[];
  wordInput: string;
  onWordInputChange: (value: string) => void;
  onSubmit: () => void;
  isInputEnabled: boolean;
  status: string;
}

/**
 * Compute the best known status for each letter based on previous guesses.
 * Priority: correct > present > absent
 * @param grid Player's grid of guesses.
 * @returns Map of letter to best known status.
 */
function computeLetterStatuses(grid: PlayerGameState['grid']): Record<string, LetterStatus> {
  const statuses: Record<string, LetterStatus> = {};
  
  for (const row of grid) {
    for (let i = 0; i < row.word.length; i++) {
      const letter = row.word[i];
      const status = row.letters[i];
      const existing = statuses[letter];
      
      // Priority: correct > present > absent
      if (!existing) {
        statuses[letter] = status;
      } else if (status === 'correct') {
        statuses[letter] = 'correct';
      } else if (status === 'present' && existing === 'absent') {
        statuses[letter] = 'present';
      }
      // If existing is correct or (existing is present and new is absent), keep existing
    }
  }
  
  return statuses;
}

/**
 * Complete Guess interface for a single player including grid and input.
 * @param props Player guess props.
 * @returns Player guess element.
 */
export function PlayerGuess({
  playerState,
  rowBests,
  wordInput,
  onWordInputChange,
  onSubmit,
  isInputEnabled,
  status,
}: PlayerGuessProps) {
  const grid = playerState?.grid || [];
  const currentRow = grid.length;

  const letterStatuses = useMemo(() => computeLetterStatuses(grid), [grid]);

  return (
    <div className="player-guess">
      <GuessGrid
        grid={grid}
        currentRow={currentRow}
        currentInput={isInputEnabled ? wordInput : ''}
        isInputEnabled={isInputEnabled}
        rowBests={rowBests}
      />

      <WordInput
        value={wordInput}
        onChange={onWordInputChange}
        onSubmit={onSubmit}
        disabled={!isInputEnabled}
        status={status}
        letterStatuses={letterStatuses}
      />
    </div>
  );
}
