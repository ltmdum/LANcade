import { useId } from 'react';
import { minuteOptions, secondOptions } from '../utils/time';
import './DurationSelector.css';

interface DurationSelectorProps {
  minutes: string;
  seconds: string;
  onChange: (minutes: string, seconds: string) => void;
}

export function DurationSelector({ minutes, seconds, onChange }: DurationSelectorProps) {
  const baseId = useId();

  return (
    <>
      <div className="duration-field">
        <label className="duration-label" htmlFor={`${baseId}-minutes`}>
          Minutes
        </label>
        <select
          id={`${baseId}-minutes`}
          className="duration-select"
          value={minutes}
          onChange={(e) => onChange(e.target.value, seconds)}
        >
          {minuteOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div className="duration-field">
        <label className="duration-label" htmlFor={`${baseId}-seconds`}>
          Seconds
        </label>
        <select
          id={`${baseId}-seconds`}
          className="duration-select"
          value={seconds}
          onChange={(e) => onChange(minutes, e.target.value)}
        >
          {secondOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    </>
  );
}
