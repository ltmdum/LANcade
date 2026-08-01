import { useState, useEffect } from 'react';
import { useCountdownTick } from '../../shared/hooks/useCountdownTick';

interface GraceCountdownProps {
  /** Server timestamp (ms) when the grace period ends. */
  graceEndsAt: number;
  /** Whether the current player has already solved the word. */
  solved: boolean;
}

/**
 * Banner showing the remaining grace time.
 * Ticks its own 1Hz clock internally so the surrounding game tree is not
 * re-rendered every second during the grace period.
 */
export function GraceCountdown({ graceEndsAt, solved }: GraceCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const seconds = Math.max(0, Math.ceil((graceEndsAt - now) / 1000));

  useCountdownTick(seconds > 0 ? seconds * 1000 : null);

  return (
    <div className="game-grace-banner">
      <span className="game-grace-timer">{seconds}s</span>
      <span>{solved ? 'You solved it! Waiting for others...' : 'Someone solved it! Solve before the countdown finishes!'}</span>
    </div>
  );
}
