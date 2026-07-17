import type { PlayerGridRow, LetterStatus, RowBestResult } from '@lancade/shared';
import './GuessGrid.css';

interface GuessGridProps {
  grid: PlayerGridRow[];
  currentRow: number;
  currentInput: string;
  isInputEnabled: boolean;
  rowBests: RowBestResult[];
  greenLetters: (string | null)[];
}

function getStatusClass(status: LetterStatus): string {
  switch (status) {
    case 'correct':
      return 'guess-cell-correct';
    case 'present':
      return 'guess-cell-present';
    default:
      return 'guess-cell-absent';
  }
}

function GridRowDisplay({ row }: { row: PlayerGridRow }) {
  return (
    <>
      {row.letters.map((status, i) => (
        <div key={i} className={`guess-cell ${getStatusClass(status)}`}>
          {row.word[i]}
        </div>
      ))}
    </>
  );
}

function CurrentInputRow({ input, isEnabled, greenLetters }: { input: string; isEnabled: boolean; greenLetters: (string | null)[] }) {
  const cells = [];
  let typedIndex = 0;
  for (let i = 0; i < 5; i++) {
    const isGreen = !!greenLetters[i];
    const letter = isGreen ? greenLetters[i] : (input[typedIndex] || '');
    const hasLetter = !!letter;
    const classNames = [
      'guess-cell',
      isGreen ? 'guess-cell-correct guess-cell-locked' : 'guess-cell-input',
      hasLetter && !isGreen ? 'guess-cell-filled' : '',
      !isEnabled && !isGreen ? 'guess-cell-disabled' : '',
    ].filter(Boolean).join(' ');
    cells.push(
      <div key={i} className={classNames}>
        {letter}
      </div>
    );
    if (!isGreen) typedIndex++;
  }
  return <>{cells}</>;
}

function EmptyRow() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="guess-cell guess-cell-empty" />
      ))}
    </>
  );
}

interface RowBestMiniProps {
  best: RowBestResult | undefined;
}

function RowBestMini({ best }: RowBestMiniProps) {
  if (!best) {
    return <div className="row-best-mini row-best-mini-empty" />;
  }

  return (
    <div className="row-best-mini" title={`Best: ${best.greenCount} green, ${best.yellowCount} yellow`}>
      {best.letters.map((status, i) => (
        <div 
          key={i} 
          className={`row-best-cell row-best-cell-${status}`}
        />
      ))}
    </div>
  );
}

export function GuessGrid({ grid, currentRow, currentInput, isInputEnabled, rowBests, greenLetters }: GuessGridProps) {
  const totalRows = 6;
  const rows = [];

  for (let i = 0; i < grid.length; i++) {
    rows.push(
      <div key={`submitted-${i}`} className="guess-row guess-row-submitted">
        <GridRowDisplay row={grid[i]} />
        <RowBestMini best={rowBests[i]} />
      </div>
    );
  }

  if (currentRow < totalRows) {
    rows.push(
      <div key="current" className="guess-row guess-row-current">
        <CurrentInputRow 
          input={currentInput} 
          isEnabled={isInputEnabled} 
          greenLetters={greenLetters}
        />
        <RowBestMini best={rowBests[currentRow]} />
      </div>
    );
  }

  for (let i = rows.length; i < totalRows; i++) {
    rows.push(
      <div key={`empty-${i}`} className="guess-row guess-row-empty">
        <EmptyRow />
        <RowBestMini best={rowBests[i]} />
      </div>
    );
  }

  return <div className="guess-grid">{rows}</div>;
}
