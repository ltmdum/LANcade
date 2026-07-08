import React from 'react';
import './WordSubmitForm.css';

interface WordSubmitFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  letter: string | null;
  disabled?: boolean;
  buttonText?: string;
  /** Override the input placeholder. Defaults to "Word starting with <letter>". */
  placeholder?: string;
  statusType?: 'success' | 'error';
}

/**
 * Reusable form for submitting words.
 * @param props Word submit form props.
 * @returns Word submit form element.
 */
export function WordSubmitForm({
  value,
  onChange,
  onSubmit,
  letter,
  disabled = false,
  buttonText = 'Submit',
  placeholder,
  statusType,
}: WordSubmitFormProps) {
  const isEmpty = value.trim() === '';
  const inputClass = `word-submit-input${statusType === 'success' ? ' word-submit-input-success' : ''}${statusType === 'error' ? ' word-submit-input-error' : ''}`;

  return (
    <form onSubmit={onSubmit} className="word-submit-form">
      <input
        type="text"
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? `Word starting with ${letter || ''}`}
        disabled={disabled}
        maxLength={100}
      />
      <button type="submit" className="btn btn-primary" disabled={disabled || isEmpty}>
        {buttonText}
      </button>
    </form>
  );
}
