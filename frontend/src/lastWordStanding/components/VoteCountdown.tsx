import { useState, useEffect } from 'react';
import { formatMs } from '../../shared/utils/time';
import './VoteCountdown.css';

interface VoteCountdownProps {
  voteEndsAt: number;
  clockSkewMs: number;
}

/**
 * Countdown display for vote timeout.
 * @param props Vote countdown props.
 * @returns Vote countdown element.
 */
export function VoteCountdown({ voteEndsAt, clockSkewMs }: VoteCountdownProps) {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const endsAt = voteEndsAt + clockSkewMs;
    setCountdown(formatMs(Math.max(0, endsAt - Date.now())));

    const interval = setInterval(() => {
      const remaining = endsAt - Date.now();
      if (remaining <= 0) {
        setCountdown('00:00');
        clearInterval(interval);
        return;
      }
      setCountdown(formatMs(remaining));
    }, 250);

    return () => clearInterval(interval);
  }, [voteEndsAt, clockSkewMs]);

  return (
    <div className="vote-countdown">
      <span className="vote-countdown-label">Vote ends in: </span>
      <span className="vote-countdown-time">{countdown}</span>
    </div>
  );
}
