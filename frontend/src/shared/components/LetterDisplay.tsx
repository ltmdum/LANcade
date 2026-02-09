interface LetterDisplayProps {
  letter: string | null;
  countdown?: string;
  showCountdown?: boolean;
}

/**
 * Display the current letter and optional countdown.
 * @param props Letter display props.
 * @returns Letter display element.
 */
export function LetterDisplay({ letter, countdown, showCountdown = false }: LetterDisplayProps) {
  return (
    <>
      <div className="letter-display">{letter || '-'}</div>
      {showCountdown && countdown && <div className="countdown">{countdown}</div>}
    </>
  );
}
