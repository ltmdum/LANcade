import { useId, useState, useEffect } from 'react';
import type { GameSettingControl } from '../../plugins/types';
import { updateGameSettings } from '../utils/api';
import { Panel } from './Panel';
import { DurationSelector } from './DurationSelector';
import './GameSettingsPanel.css';

interface GameSettingsPanelProps {
  controls: GameSettingControl[];
  values: Record<string, number>;
  accessKey: string;
  onUnauthorized: () => void;
}

/**
 * Admin panel for game-specific settings.
 * Renders controls declared in the plugin config and sends updates to the server.
 * @param props Settings panel props.
 * @returns Settings panel element.
 */
export function GameSettingsPanel({
  controls,
  values,
  accessKey,
  onUnauthorized,
}: GameSettingsPanelProps) {
  const baseId = useId();
  const hasDuration = controls.some(c => c.type === 'duration');

  async function handleChange(key: string, value: number) {
    if (!accessKey) return;
    try {
      const { response } = await updateGameSettings({ [key]: value }, accessKey);
      if (response.status === 401) onUnauthorized();
    } catch { /* ignore */ }
  }

  return (
    <Panel title="Game Settings">
      <div className="game-settings-controls">
        {controls.map((control) => {
          if (control.type === 'duration') {
            return (
              <DurationControl
                key={control.key}
                control={control}
                value={values[control.key] as number | undefined}
                onChange={handleChange}
              />
            );
          }
          return (
            <SelectControl
              key={control.key}
              control={control}
              value={values[control.key] as number | undefined}
              baseId={baseId}
              onChange={handleChange}
              needsSpacer={hasDuration}
            />
          );
        })}
      </div>
    </Panel>
  );
}

interface SelectControlProps {
  control: GameSettingControl & { type: 'select' };
  value: number | undefined;
  baseId: string;
  onChange: (key: string, value: number) => void;
  needsSpacer?: boolean;
}

function SelectControl({ control, value, baseId, onChange, needsSpacer }: SelectControlProps) {
  const current = value ?? control.defaultValue;
  const selectClass = needsSpacer
    ? 'game-settings-select game-settings-select-alone'
    : 'game-settings-select';
  return (
    <div className="game-settings-field">
      <label className="game-settings-label" htmlFor={`${baseId}-${control.key}`}>
        {control.label}
      </label>
      <select
        id={`${baseId}-${control.key}`}
        className={selectClass}
        value={current}
        onChange={(e) => onChange(control.key, Number(e.target.value))}
      >
        {control.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

interface DurationControlProps {
  control: GameSettingControl & { type: 'duration' };
  value: number | undefined;
  onChange: (key: string, value: number) => void;
}

function DurationControl({ control, value, onChange }: DurationControlProps) {
  const stored = value ?? 0;
  const multiplier = control.valueMultiplier ?? 1;
  const totalSeconds = stored / multiplier;
  const defaultMinutes = control.defaultMinutes ?? '00';
  const defaultSeconds = control.defaultSeconds ?? '30';

  const initialMinutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const initialSeconds = String(totalSeconds % 60).padStart(2, '0');

  const [minutes, setMinutes] = useState(
    totalSeconds > 0 || stored > 0 ? initialMinutes : defaultMinutes
  );
  const [seconds, setSeconds] = useState(
    totalSeconds > 0 || stored > 0 ? initialSeconds : defaultSeconds
  );

  useEffect(() => {
    if (stored > 0 || value !== undefined) {
      const ts = value ? value / multiplier : 0;
      setMinutes(String(Math.floor(ts / 60)).padStart(2, '0'));
      setSeconds(String(ts % 60).padStart(2, '0'));
    }
  }, [value, multiplier]);

  function handleDurationChange(m: string, s: string) {
    setMinutes(m);
    setSeconds(s);
    const totalSec = parseInt(m, 10) * 60 + parseInt(s, 10);
    onChange(control.key, totalSec * multiplier);
  }

  return (
    <div className="game-settings-field">
      <label className="game-settings-label">{control.label}</label>
      <div className="game-settings-duration-row">
        <DurationSelector
          minutes={minutes}
          seconds={seconds}
          onChange={handleDurationChange}
        />
      </div>
    </div>
  );
}
