import type { PlayerGridRow, LetterStatus, RowBestResult } from '@lancade/shared';
import './GuessGrid.css';

interface GuessGridProps {
  grid: PlayerGridRow[];
  currentRow: number;
  currentInput: string;
  isInputEnabled: boolean;
  rowBests: RowBestResult[];
}

/**
 * Get the CSS class for a letter status.
 * @param status Letter status.
 * @returns CSS class name.
 */
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

/**
 * Render a single grid row with its letters.
 * @param props Row props.
 * @returns Row element.
 */
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

/**
 * Render the current input row.
 * @param props Input row props.
 * @returns Input row element.
 */
function CurrentInputRow({ input, isEnabled }: { input: string; isEnabled: boolean }) {
  const cells = [];
  for (let i = 0; i < 5; i++) {
    const letter = input[i] || '';
    const hasLetter = letter !== '';
    cells.push(
      <div 
        key={i} 
        className={`guess-cell guess-cell-input ${hasLetter ? 'guess-cell-filled' : ''} ${!isEnabled ? 'guess-cell-disabled' : ''}`}
      >
        {letter}
      </div>
    );
  }
  return <>{cells}</>;
}

/**
 * Render empty cells.
 * @returns Empty cells element.
 */
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

/**
 * Mini display showing the best result across all players for a row.
 * Shows 5 small colored squares representing the best letters found.
 * @param props Row best mini props.
 * @returns Row best mini element.
 */
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

/**
 * The main Guess-style grid display with row best indicators.
 * @param props Grid props.
 * @returns Grid element.
 */
export function GuessGrid({ grid, currentRow, currentInput, isInputEnabled, rowBests }: GuessGridProps) {
  const totalRows = 6;
  const rows = [];

  // Add submitted rows
  for (let i = 0; i < grid.length; i++) {
    rows.push(
      <div key={`submitted-${i}`} className="guess-row guess-row-submitted">
        <GridRowDisplay row={grid[i]} />
        <RowBestMini best={rowBests[i]} />
      </div>
    );
  }

  // Add current input row if game is still active
  if (currentRow < totalRows) {
    rows.push(
      <div key="current" className="guess-row guess-row-current">
        <CurrentInputRow 
          input={currentInput} 
          isEnabled={isInputEnabled} 
        />
        <RowBestMini best={rowBests[currentRow]} />
      </div>
    );
  }

  // Fill remaining rows with empty placeholders
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
