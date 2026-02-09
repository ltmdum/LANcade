import { useId, useState, useEffect } from 'react';
import { Panel } from './Panel';
import { startRound } from '../utils/api';
import { buildDurationMs, minuteOptions, secondOptions } from '../utils/time';
import { checkPlayerRequirements } from '../utils/playerRequirements';
import './RoundControl.css';

interface RoundControlProps {
  adminSessionId: string;
  onExpired: () => void;
  onRoundStarted?: () => void;
  title?: string;
  defaultMinutes?: string;
  defaultSeconds?: string;
  playerCount?: number;
  minPlayers?: number;
  hideTimer?: boolean;
}

/**
 * Admin controls for starting a timed round.
 * @param props Round control props.
 * @returns Round control element.
 */
export function RoundControl({
  adminSessionId,
  onExpired,
  onRoundStarted,
  title = 'Round Control',
  defaultMinutes = '01',
  defaultSeconds = '30',
  playerCount = 0,
  minPlayers,
  hideTimer = false,
}: RoundControlProps) {
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [status, setStatus] = useState('');
  const baseId = useId();

  const { canStart, waitingMessage } = checkPlayerRequirements(playerCount, minPlayers);

  useEffect(() => {
    setMinutes(defaultMinutes);
    setSeconds(defaultSeconds);
  }, [defaultMinutes, defaultSeconds]);

  async function handleStart() {
    if (!adminSessionId) {
      setStatus('Claim admin before starting.');
      return;
    }
    // For games without timer, use a dummy duration
    const durationMs = hideTimer ? 1000 : buildDurationMs(minutes, seconds);
    if (!durationMs) {
      setStatus('Select a time limit.');
      return;
    }
    setStatus('');
    try {
      const { response } = await startRound(durationMs, adminSessionId);
      if (response.status === 401) {
        onExpired();
        return;
      }
      if (!response.ok) {
        setStatus('Could not start the round.');
        return;
      }
      setStatus('Round started.');
      onRoundStarted?.();
    } catch {
      setStatus('Could not start the round.');
    }
  }

  return (
    <Panel title={title}>
      <div className="round-control-row">
        {!hideTimer && (
          <>
            <div className="round-control-field">
              <label className="round-control-label" htmlFor={`${baseId}-minutes`}>
                Minutes
              </label>
              <select
                id={`${baseId}-minutes`}
                className="round-control-select"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              >
                {minuteOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="round-control-field">
              <label className="round-control-label" htmlFor={`${baseId}-seconds`}>
                Seconds
              </label>
              <select
                id={`${baseId}-seconds`}
                className="round-control-select"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
              >
                {secondOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleStart}
          disabled={!adminSessionId || !canStart}
        >
          Start
        </button>
      </div>
      {waitingMessage && <p className="round-control-waiting">{waitingMessage}</p>}
      {status && <p className="round-control-status">{status}</p>}
    </Panel>
  );
}
