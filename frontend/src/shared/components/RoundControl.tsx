import { useId, useState, useEffect } from 'react';
import { Panel } from './Panel';
import { startRound } from '../utils/api';
import { buildDurationMs, minuteOptions, secondOptions } from '../utils/time';
import { checkPlayerRequirements } from '../utils/playerRequirements';
import './RoundControl.css';

interface CustomDurationConfig {
  label: string;
  options: { label: string; durationMs: number }[];
}

interface RoundControlProps {
  accessKey: string;
  onUnauthorized: () => void;
  onRoundStarted?: () => void;
  title?: string;
  defaultMinutes?: string;
  defaultSeconds?: string;
  playerCount?: number;
  minPlayers?: number;
  hideTimer?: boolean;
  customDuration?: CustomDurationConfig;
  /** Admin has opted to play but hasn't joined the player list yet. */
  needsToJoinAsPlayer?: boolean;
}

/**
 * Admin controls for starting a timed round.
 * @param props Round control props.
 * @returns Round control element.
 */
export function RoundControl({
  accessKey,
  onUnauthorized,
  onRoundStarted,
  title = 'Round Control',
  defaultMinutes = '01',
  defaultSeconds = '30',
  playerCount = 0,
  minPlayers,
  hideTimer = false,
  customDuration,
  needsToJoinAsPlayer = false,
}: RoundControlProps) {
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [customIndex, setCustomIndex] = useState(0);
  const [status, setStatus] = useState('');
  const baseId = useId();

  const playerCheck = checkPlayerRequirements(playerCount, minPlayers);
  const needsJoin = needsToJoinAsPlayer;

  const canStart = !needsJoin && playerCheck.canStart;
  const waitingMessage = needsJoin
    ? 'Join as a player before starting the game.'
    : playerCheck.waitingMessage;

  useEffect(() => {
    setMinutes(defaultMinutes);
    setSeconds(defaultSeconds);
  }, [defaultMinutes, defaultSeconds]);

  async function handleStart() {
    if (needsJoin) {
      setStatus('Join as a player before starting the game.');
      return;
    }
    if (!accessKey) {
      setStatus('Admin access required.');
      return;
    }
    // For games without timer, use a dummy duration
    const durationMs = customDuration
      ? customDuration.options[customIndex]?.durationMs
      : hideTimer ? 1000 : buildDurationMs(minutes, seconds);
    if (!durationMs) {
      setStatus('Select a time limit.');
      return;
    }
    setStatus('');
    try {
      const { response } = await startRound(durationMs, accessKey);
      if (response.status === 401) {
        onUnauthorized();
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
        {customDuration && (
          <div className="round-control-field">
            <label className="round-control-label" htmlFor={`${baseId}-custom`}>
              {customDuration.label}
            </label>
            <select
              id={`${baseId}-custom`}
              className="round-control-select"
              value={customIndex}
              onChange={(e) => setCustomIndex(Number(e.target.value))}
            >
              {customDuration.options.map((opt, i) => (
                <option key={i} value={i}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
        {!customDuration && !hideTimer && (
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
          disabled={!accessKey || !canStart}
        >
          Start
        </button>
      </div>
      {waitingMessage && <p className="round-control-waiting">{waitingMessage}</p>}
      {status && <p className="round-control-status">{status}</p>}
    </Panel>
  );
}
