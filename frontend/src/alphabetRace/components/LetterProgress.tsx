import '../../alphabetRace/AlphabetRaceGame.css';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface LetterProgressProps {
  letterSequence: string[];
  currentLetterIndex: number;
  completedCount: number;
}

/**
 * Visual progress through the alphabet.
 * Shows all 26 letters in A-Z order with completed/current/pending
 * status derived from the random letter sequence positions.
 * @param props Letter progress display props.
 * @returns Letter progress element.
 */
export function LetterProgress({
  letterSequence,
  currentLetterIndex,
  completedCount,
}: LetterProgressProps) {
  const seqIndexByLetter = new Map(letterSequence.map((ch, i) => [ch, i]));

  return (
    <div>
      <div className="letter-progress">
        {ALPHABET.map((letter) => {
          const seqIndex = seqIndexByLetter.get(letter)!;
          const isUsed = seqIndex < completedCount;
          const isCurrent = seqIndex === currentLetterIndex;
          const className = [
            'letter-progress-item',
            isUsed ? 'letter-progress-item--completed' : '',
            isCurrent ? 'letter-progress-item--current' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <span key={letter} className={className}>
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
