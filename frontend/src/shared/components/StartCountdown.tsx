import { useEffect, useState } from 'react';
import { playTickSound, playPopSound } from '../utils/sounds';
import './StartCountdown.css';

const DIGIT_MS = 1000;
const GO_MS = 1000;
const FADE_MS = 400;
const STEPS = ['3', '2', '1', 'GO'] as const;

/**
 * Full-screen 3-2-1-GO countdown shown before a round starts.
 *
 * The sequence is timed locally at one-second intervals so the tick sounds
 * stay in sync with the digits. On a LAN every client starts the overlay
 * from the same broadcast, so the GO moment lands within a fraction of a
 * second of the round's actual start.
 */
export function StartCountdown() {
  const [step, setStep] = useState(0);
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timeouts: number[] = [];
    playTickSound();
    for (let i = 1; i < STEPS.length; i++) {
      timeouts.push(
        window.setTimeout(() => {
          setStep(i);
          if (i < STEPS.length - 1) {
            playTickSound();
          } else {
            playPopSound(660, 0.35);
          }
        }, i * DIGIT_MS)
      );
    }
    timeouts.push(window.setTimeout(() => setFading(true), 3 * DIGIT_MS + GO_MS));
    timeouts.push(
      window.setTimeout(() => setHidden(true), 3 * DIGIT_MS + GO_MS + FADE_MS)
    );
    return () => {
      for (const t of timeouts) {
        window.clearTimeout(t);
      }
    };
  }, []);

  if (hidden) return null;

  const label = STEPS[step];
  const isGo = label === 'GO';
  const className = isGo ? 'start-countdown-go' : 'start-countdown-digit';

  return (
    <div
      className={fading ? 'start-countdown-overlay start-countdown-overlay-fade' : 'start-countdown-overlay'}
      role="status"
      aria-live="polite"
    >
      <div key={step} className={className}>
        {label}
      </div>
    </div>
  );
}