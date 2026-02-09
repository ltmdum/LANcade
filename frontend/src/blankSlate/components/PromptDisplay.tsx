import type { BlankSlatePrompt } from '@lancade/shared';
import './PromptDisplay.css';

interface PromptDisplayProps {
  prompt: BlankSlatePrompt;
}

/**
 * Display the fill-in-the-blank prompt.
 * @param props Prompt display props.
 * @returns Prompt display element.
 */
export function PromptDisplay({ prompt }: PromptDisplayProps) {
  return (
    <div className="blankslate-prompt">
      {prompt.blankPosition === 'before' ? (
        <>
          <span className="blank" /> {prompt.text}
        </>
      ) : (
        <>
          {prompt.text} <span className="blank" />
        </>
      )}
    </div>
  );
}
