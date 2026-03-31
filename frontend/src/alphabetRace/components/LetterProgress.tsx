import '../../alphabetRace/AlphabetRaceGame.css';

interface LetterProgressProps {
  letterSequence: string[];
  currentLetterIndex: number;
  completedCount: number;
}

/**
 * Visual progress through the alphabet letter sequence.
 * Shows all letters with highlighting for completed and current.
 * @param props Letter progress display props.
 * @returns Letter progress element.
 */
export function LetterProgress({
  letterSequence,
  currentLetterIndex,
  completedCount,
}: LetterProgressProps) {
  return (
    <div>
      <div className="letter-progress">
        {letterSequence.map((letter, index) => {
          const isCompleted = index < completedCount;
          const isCurrent = index === currentLetterIndex;
          const className = [
            'letter-progress-item',
            isCompleted ? 'letter-progress-item--completed' : '',
            isCurrent ? 'letter-progress-item--current' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <span key={`${letter}-${index}`} className={className}>
              {letter}
            </span>
          );
        })}
      </div>
      <p className="alphabet-progress-count">
        {completedCount} of {letterSequence.length} completed
      </p>
    </div>
  );
}
