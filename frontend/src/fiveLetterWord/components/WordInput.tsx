import { useRef, useEffect } from 'react';
import type { LetterStatus } from '@lancade/shared';
import './WordInput.css';

interface WordInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  status: string;
  letterStatuses: Record<string, LetterStatus>;
  greenLetters: (string | null)[];
}

function getKeyStatusClass(letter: string, statuses: Record<string, LetterStatus>): string {
  const status = statuses[letter];
  if (!status) return '';
  switch (status) {
    case 'correct':
      return 'word-keyboard-key-correct';
    case 'present':
      return 'word-keyboard-key-present';
    case 'absent':
      return 'word-keyboard-key-absent';
    default:
      return '';
  }
}

export function WordInput({ value: _value, onChange, onSubmit, disabled, status, letterStatuses, greenLetters }: WordInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nonGreenCount = greenLetters.filter(l => !l).length;
  const valueRef = useRef(_value);
  valueRef.current = _value;

  const handleKeyPressRef = useRef<(key: string) => void>(() => {});

  handleKeyPressRef.current = (key: string) => {
    if (disabled) return;

    const currentValue = valueRef.current;

    if (key === 'ENTER') {
      if (currentValue.length === nonGreenCount) {
        onSubmit();
      }
    } else if (key === 'BACK' || key === 'BACKSPACE') {
      const newValue = currentValue.slice(0, -1);
      valueRef.current = newValue;
      onChange(newValue);
    } else if (key.length === 1 && /^[A-Z]$/i.test(key)) {
      if (currentValue.length >= nonGreenCount) return;

      const letter = key.toUpperCase();
      const newValue = currentValue + letter;
      valueRef.current = newValue;
      onChange(newValue);
    }
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const key = e.key.toUpperCase();
      if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        handleKeyPressRef.current(key);
      }
    }

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      container.setAttribute('tabindex', '0');
      if (!disabled) {
        container.focus();
      }
    }

    return () => {
      if (container) {
        container.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [disabled]);

  const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
  ];

  return (
    <div 
      ref={containerRef} 
      className={`word-input-container ${disabled ? 'word-input-disabled' : ''}`}
    >
      <div className="word-keyboard">
        {keyboardRows.map((row, rowIndex) => (
          <div key={rowIndex} className="word-keyboard-row">
            {row.map((key) => {
              const isWideKey = key === 'ENTER' || key === 'BACK';
              const statusClass = isWideKey ? '' : getKeyStatusClass(key, letterStatuses);
              const actionClass = key === 'ENTER' ? 'word-keyboard-key-enter' : key === 'BACK' ? 'word-keyboard-key-back' : '';
              return (
                <button
                  key={key}
                  type="button"
                  className={`word-keyboard-key ${isWideKey ? 'word-keyboard-key-wide' : ''} ${statusClass} ${actionClass}`}
                  onClick={() => handleKeyPressRef.current(key)}
                  disabled={disabled}
                  tabIndex={-1}
                >
                  {key === 'BACK' ? '⌫' : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {status && <p className="word-input-status">{status}</p>}
    </div>
  );
}
