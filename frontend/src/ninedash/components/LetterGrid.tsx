import './LetterGrid.css';

interface LetterGridProps {
  letters: string[];
  selectedIndices?: number[];
  onTileClick?: (index: number) => void;
}

/**
 * Render the 3x3 matrix of available letter tiles.
 * Tiles are tappable when onTileClick is provided.
 * @param props Letter grid props.
 * @returns Letter grid element.
 */
export function LetterGrid({ letters, selectedIndices = [], onTileClick }: LetterGridProps) {
  return (
    <div className="letter-grid" role="grid" aria-label="Letter tiles">
      {letters.map((letter, index) => {
        const isSelected = selectedIndices.includes(index);
        const className = `letter-grid-tile${isSelected ? ' letter-grid-tile-selected' : ''}${onTileClick ? ' letter-grid-tile-interactive' : ''}`;

        return (
          <div
            key={`${letter}-${index}`}
            className={className}
            role="gridcell"
            {...onTileClick && {
              onClick: () => onTileClick(index),
              'aria-label': `Letter ${letter}${isSelected ? ', selected' : ''}`,
            }}
          >
            {letter}
          </div>
        );
      })}
    </div>
  );
}
