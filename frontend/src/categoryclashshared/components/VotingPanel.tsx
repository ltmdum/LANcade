import { Panel } from '../../shared/components/Panel';
import type { AnonymousWordEntry } from '@lancade/shared';
import './VotingPanel.css';

interface VotingPanelProps {
  words: AnonymousWordEntry[];
  voteSet: Set<string>;
  onToggleVote: (wordId: string) => void;
  onSubmitVotes: () => void;
  hasVoted: boolean;
  voteStatus: string;
  showCategory?: boolean;
  title?: string;
  description?: string;
}

/**
 * Voting panel with thumb-up/thumb-down toggles for each word.
 * Thumb-up is selected by default; toggling to thumb-down marks the word
 * for downvoting. Exactly one of the two must be selected at all times.
 * @param props Voting panel props.
 * @returns Voting panel element.
 */
export function VotingPanel({
  words,
  voteSet,
  onToggleVote,
  onSubmitVotes,
  hasVoted,
  voteStatus,
  showCategory = false,
  title = 'Vote on Words',
  description = 'Reject words you disagree with.',
}: VotingPanelProps) {
  return (
    <Panel title={title}>
      {description && <p className="voting-panel-description">{description}</p>}
      <div className="voting-panel-words">
        {words.length > 0 ? (
          words.map((word) => {
            const isDownvoted = voteSet.has(word.id);
            return (
              <div key={word.id} className="voting-panel-row">
                <div className="voting-panel-toggles">
                  <button
                    type="button"
                    className={`voting-panel-thumb ${!isDownvoted ? 'voting-panel-thumb--up-active' : ''}`}
                    onClick={() => { if (isDownvoted) onToggleVote(word.id); }}
                    disabled={hasVoted}
                    aria-label="Accept"
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    className={`voting-panel-thumb ${isDownvoted ? 'voting-panel-thumb--down-active' : ''}`}
                    onClick={() => { if (!isDownvoted) onToggleVote(word.id); }}
                    disabled={hasVoted}
                    aria-label="Reject"
                  >
                    👎
                  </button>
                </div>
                <span className="voting-panel-word-text">
                  {word.word}
                  {showCategory && word.category && ` (${word.category})`}
                </span>
              </div>
            );
          })
        ) : (
          <p className="voting-panel-no-submissions">No words to vote on.</p>
        )}
      </div>
      <button
        type="button"
        className="voting-panel-submit"
        onClick={onSubmitVotes}
        disabled={hasVoted}
      >
        {hasVoted ? 'Votes Submitted' : 'Submit Votes'}
      </button>
      {voteStatus && <p className="voting-panel-status">{voteStatus}</p>}
    </Panel>
  );
}
