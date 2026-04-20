import { useState, useEffect } from 'react';

interface InactivityTimerProps {
  roundEndsAt: number | null;
  clockSkewMs: number;
}

/**
 * Inline countdown display showing "Cards reveal in: Xs".
 * Turns red for the last 5 seconds.
 * @param props Timer props.
 * @returns Timer element.
 */
export function InactivityTimer({ roundEndsAt, clockSkewMs }: InactivityTimerProps) {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!roundEndsAt) {
      setRemainingMs(0);
      return;
    }

    function tick() {
      const adjusted = Date.now() - clockSkewMs;
      setRemainingMs(Math.max(0, roundEndsAt! - adjusted));
    }

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [roundEndsAt, clockSkewMs]);

  if (!roundEndsAt) return null;

  const seconds = Math.ceil(remainingMs / 1000);
  const isUrgent = seconds <= 5;

  return (
    <div className={`te-timer ${isUrgent ? 'te-timer--urgent' : ''}`}>
      <span className="te-timer__label">Cards reveal in:</span>
      <span className="te-timer__value">{seconds}s</span>
    </div>
  );
}
