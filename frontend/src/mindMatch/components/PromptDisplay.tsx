import type { MindMatchPrompt } from '@lancade/shared';
import './PromptDisplay.css';

interface PromptDisplayProps {
  prompt: MindMatchPrompt;
  editable?: boolean;
  word?: string;
  onWordChange?: (value: string) => void;
}

/**
 * Display the fill-in-the-blank prompt.
 * @param props Prompt display props.
 * @returns Prompt display element.
 */
export function PromptDisplay({
  prompt,
  editable,
  word,
  onWordChange,
}: PromptDisplayProps) {
  if (editable) {
    return (
      <div className="blankslate-prompt editable">
        {prompt.blankPosition === 'before' ? (
          <>
            <input
              className="blank-input"
              type="text"
              value={word || ''}
              onChange={(e) => onWordChange?.(e.target.value)}
              autoFocus
              maxLength={100}
            />
            <span>{prompt.text}</span>
          </>
        ) : (
          <>
            <span>{prompt.text}</span>
            <input
              className="blank-input"
              type="text"
              value={word || ''}
              onChange={(e) => onWordChange?.(e.target.value)}
              autoFocus
              maxLength={100}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="blankslate-prompt">
      {prompt.blankPosition === 'before' ? (
        <>
          {word ? <span className="blank-filled">{word}</span> : <span className="blank" />}{' '}
          {prompt.text}
        </>
      ) : (
        <>
          {prompt.text}{' '}
          {word ? <span className="blank-filled">{word}</span> : <span className="blank" />}
        </>
      )}
    </div>
  );
}
