import React from 'react';
import './WordSubmitForm.css';

interface WordSubmitFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  letter: string | null;
  disabled?: boolean;
  buttonText?: string;
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
}: WordSubmitFormProps) {
  const isEmpty = value.trim() === '';

  return (
    <form onSubmit={onSubmit} className="word-submit-form">
      <input
        type="text"
        className="word-submit-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Word starting with ${letter || ''}`}
        disabled={disabled}
        maxLength={100}
      />
      <button type="submit" className="btn btn-primary" disabled={disabled || isEmpty}>
        {buttonText}
      </button>
    </form>
  );
}
