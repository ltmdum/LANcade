import React from 'react';
import './CategoryWordInput.css';

interface CategoryWordInputProps {
  category: string;
  currentInput: string;
  acceptedWord: string | undefined;
  letter: string | null;
  timeUp: boolean;
  onInputChange: (category: string, value: string) => void;
  onSubmit: (category: string, e: React.FormEvent) => void;
}

/**
 * Input row for a single category entry.
 * @param props Category word input props.
 * @returns Category word input element.
 */
export function CategoryWordInput({
  category,
  currentInput,
  acceptedWord,
  letter,
  timeUp,
  onInputChange,
  onSubmit,
}: CategoryWordInputProps) {
  const isSubmitted = acceptedWord && currentInput === acceptedWord;
  const hasChanged = currentInput.trim() !== '' && currentInput !== acceptedWord;
  const containerClass = `category-word-input ${acceptedWord ? 'category-word-input-accepted' : 'category-word-input-default'}`;
  const inputClass = `category-word-input-field ${isSubmitted ? 'category-word-input-field-submitted' : ''}`;

  return (
    <div className={containerClass}>
      <div className="category-word-input-label">{category}</div>
      <form onSubmit={(e) => onSubmit(category, e)} className="category-word-input-form">
        <div className="category-word-input-wrapper">
          <input
            type="text"
            className={inputClass}
            value={currentInput}
            onChange={(e) => onInputChange(category, e.target.value)}
            placeholder={`Word starting with ${letter || ''}`}
            disabled={timeUp}
            maxLength={100}
          />
          {isSubmitted && (
            <span className="category-word-input-check">✓</span>
          )}
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={timeUp || !hasChanged}
        >
          {acceptedWord ? 'Update' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
