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
  greenLetters: (string | null)[];
}

function computeLetterStatuses(grid: PlayerGameState['grid']): Record<string, LetterStatus> {
  const statuses: Record<string, LetterStatus> = {};
  
  for (const row of grid) {
    for (let i = 0; i < row.word.length; i++) {
      const letter = row.word[i];
      const status = row.letters[i];
      const existing = statuses[letter];
      
      if (!existing) {
        statuses[letter] = status;
      } else if (status === 'correct') {
        statuses[letter] = 'correct';
      } else if (status === 'present' && existing === 'absent') {
        statuses[letter] = 'present';
      }
    }
  }
  
  return statuses;
}

export function PlayerGuess({
  playerState,
  rowBests,
  wordInput,
  onWordInputChange,
  onSubmit,
  isInputEnabled,
  status,
  greenLetters,
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
        greenLetters={greenLetters}
      />

      <WordInput
        value={wordInput}
        onChange={onWordInputChange}
        onSubmit={onSubmit}
        disabled={!isInputEnabled}
        status={status}
        letterStatuses={letterStatuses}
        greenLetters={greenLetters}
      />
    </div>
  );
}
