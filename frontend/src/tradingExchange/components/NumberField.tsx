import { useState, useRef, useCallback, useEffect } from 'react';

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  /** Highlight style: 'buy' for green, 'sell' for red. */
  highlight?: 'buy' | 'sell' | null;
}

const GHOST_OPACITIES = [0.6, 0.25];
const TOUCH_THRESHOLD_PX = 30;

/**
 * Numeric input with +/- buttons and scrollable ghost values.
 * Tapping/clicking the input activates the field: ghost values appear as
 * an overlay and scroll/swipe adjusts the value. Tapping outside deactivates.
 * Swipe up = higher number, swipe down = lower number.
 * @param props Number field props.
 * @returns Number field element.
 */
export function NumberField({ label, value, onChange, disabled, className = '', highlight }: NumberFieldProps) {
  const [active, setActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const numVal = parseInt(value, 10);
  const current = Number.isFinite(numVal) ? numVal : 0;
  const touchYRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActive(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [active]);

  const increment = useCallback(() => {
    if (!disabled) onChange(String(current + 1));
  }, [current, onChange, disabled]);

  const decrement = useCallback(() => {
    if (!disabled) onChange(String(Math.max(0, current - 1)));
  }, [current, onChange, disabled]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (disabled) return;
    e.preventDefault();
    if (e.deltaY < 0) onChange(String(current + 1));
    else if (e.deltaY > 0) onChange(String(Math.max(0, current - 1)));
  }, [current, onChange, disabled]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchYRef.current = e.touches[0].clientY;
  }, []);

  /** Swipe up = lower number (scroll the drum up), swipe down = higher number. */
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    const delta = touchYRef.current - e.touches[0].clientY;
    if (Math.abs(delta) >= TOUCH_THRESHOLD_PX) {
      // delta > 0 means finger moved up → decrease value (like scrolling a drum)
      onChange(String(Math.max(0, delta > 0 ? current - 1 : current + 1)));
      touchYRef.current = e.touches[0].clientY;
      e.preventDefault();
    }
  }, [current, onChange, disabled]);

  let controlsClass = 'te-number-field__controls';
  if (highlight === 'buy') controlsClass += ' te-number-field__controls--buy';
  if (highlight === 'sell') controlsClass += ' te-number-field__controls--sell';

  return (
    <div className={`te-number-field ${className}`} ref={containerRef}>
      <label className="te-number-field__label">{label}</label>
      {/* Wrapper for positioning ghosts relative to the controls */}
      <div className="te-number-field__wrapper">
        <div
          className={controlsClass}
          onWheel={handleWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
        >
          <button type="button" className="te-number-field__btn" onClick={decrement} disabled={disabled}>-</button>
          <input
            type="number"
            min="0"
            step="1"
            className="te-number-field__input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setActive(true)}
            disabled={disabled}
          />
          <button type="button" className="te-number-field__btn" onClick={increment} disabled={disabled}>+</button>
        </div>
        {active && (
          <>
            <div
              className="te-number-field__ghosts te-number-field__ghosts--above"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
            >
              {/* Closest to input first (current+1), furthest last (current+2) */}
              {current + 1 >= 0 && (
                <span className="te-number-field__ghost" style={{ opacity: GHOST_OPACITIES[0] }}>{current + 1}</span>
              )}
              {current + 2 >= 0 && (
                <span className="te-number-field__ghost" style={{ opacity: GHOST_OPACITIES[1] }}>{current + 2}</span>
              )}
            </div>
            <div
              className="te-number-field__ghosts te-number-field__ghosts--below"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
            >
              {current - 1 >= 0 && (
                <span className="te-number-field__ghost" style={{ opacity: GHOST_OPACITIES[0] }}>{current - 1}</span>
              )}
              {current - 2 >= 0 && (
                <span className="te-number-field__ghost" style={{ opacity: GHOST_OPACITIES[1] }}>{current - 2}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
