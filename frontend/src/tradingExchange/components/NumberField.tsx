interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  /** Highlight style: 'buy' for green, 'sell' for red. */
  highlight?: 'buy' | 'sell' | null;
}

/**
 * Numeric input with +/- stepper buttons.
 * @param props Number field props.
 * @returns Number field element.
 */
export function NumberField({ label, value, onChange, disabled, className = '', highlight }: NumberFieldProps) {
  const numVal = parseInt(value, 10);
  const increment = () => onChange(String((Number.isFinite(numVal) ? numVal : 0) + 1));
  const decrement = () => onChange(String(Math.max(0, (Number.isFinite(numVal) ? numVal : 0) - 1)));

  let inputClass = 'te-number-field__input';
  if (highlight === 'buy') inputClass += ' te-number-field__input--buy';
  if (highlight === 'sell') inputClass += ' te-number-field__input--sell';

  return (
    <div className={`te-number-field ${className}`}>
      <label className="te-number-field__label">{label}</label>
      <div className="te-number-field__controls">
        <button type="button" className="te-number-field__btn" onClick={decrement} disabled={disabled}>-</button>
        <input
          type="number"
          min="0"
          step="1"
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        <button type="button" className="te-number-field__btn" onClick={increment} disabled={disabled}>+</button>
      </div>
    </div>
  );
}
