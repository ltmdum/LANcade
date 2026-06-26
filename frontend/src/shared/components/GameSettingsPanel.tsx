import { useId } from 'react';
import type { GameSettingControl } from '../../plugins/types';
import { updateGameSettings } from '../utils/api';
import { Panel } from './Panel';
import './GameSettingsPanel.css';

interface GameSettingsPanelProps {
  controls: GameSettingControl[];
  values: Record<string, unknown>;
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
        {controls.map((control) => (
          <SelectControl
            key={control.key}
            control={control}
            value={values[control.key] as number | undefined}
            baseId={baseId}
            onChange={handleChange}
          />
        ))}
      </div>
    </Panel>
  );
}

interface SelectControlProps {
  control: GameSettingControl;
  value: number | undefined;
  baseId: string;
  onChange: (key: string, value: number) => void;
}

function SelectControl({ control, value, baseId, onChange }: SelectControlProps) {
  const current = value ?? control.defaultValue;
  return (
    <div className="game-settings-field">
      <label className="game-settings-label" htmlFor={`${baseId}-${control.key}`}>
        {control.label}
      </label>
      <select
        id={`${baseId}-${control.key}`}
        className="game-settings-select"
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
