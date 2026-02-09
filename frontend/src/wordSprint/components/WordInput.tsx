import { useRef, useEffect, useCallback } from 'react';
import type { LetterStatus } from '@lancade/shared';
import './WordInput.css';

interface WordInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  status: string;
  letterStatuses: Record<string, LetterStatus>;
}

/**
 * Get the CSS class for a keyboard key based on its letter status.
 * @param letter The letter key.
 * @param statuses Map of letter to status.
 * @returns CSS class name.
 */
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

/**
 * Word input component with virtual keyboard for Guess.
 * Uses a hidden input to capture physical keyboard events while
 * preventing the mobile keyboard from appearing.
 * @param props Input props.
 * @returns Input element.
 */
export function WordInput({ value, onChange, onSubmit, disabled, status, letterStatuses }: WordInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyPress = useCallback((key: string) => {
    if (disabled) return;
    
    if (key === 'ENTER') {
      if (value.length === 5) {
        onSubmit();
      }
    } else if (key === 'BACK' || key === 'BACKSPACE') {
      onChange(value.slice(0, -1));
    } else if (key.length === 1 && /^[A-Z]$/i.test(key) && value.length < 5) {
      onChange(value + key.toUpperCase());
    }
  }, [disabled, value, onChange, onSubmit]);

  // Listen for physical keyboard events on the container
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (disabled) return;
      
      const key = e.key.toUpperCase();
      if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        handleKeyPress(key);
      }
    }

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      // Make container focusable and focus it
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
  }, [disabled, handleKeyPress]);

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
              return (
                <button
                  key={key}
                  type="button"
                  className={`word-keyboard-key ${isWideKey ? 'word-keyboard-key-wide' : ''} ${statusClass}`}
                  onClick={() => handleKeyPress(key)}
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
