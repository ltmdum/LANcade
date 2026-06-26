import './LetterGrid.css';

interface LetterGridProps {
  letters: string[];
}

/**
 * Render the 3x3 matrix of available letter tiles.
 * @param props Letter grid props.
 * @returns Letter grid element.
 */
export function LetterGrid({ letters }: LetterGridProps) {
  return (
    <div className="letter-grid" role="grid" aria-label="Letter tiles">
      {letters.map((letter, index) => (
        <div key={`${letter}-${index}`} className="letter-grid-tile" role="gridcell">
          {letter}
        </div>
      ))}
    </div>
  );
}
