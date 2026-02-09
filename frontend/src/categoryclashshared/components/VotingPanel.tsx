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
 * Voting panel for downvoting submitted words.
 * Words are displayed anonymously in submission order so voters cannot
 * identify who wrote each entry.
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
  description = 'Downvote words you reject.',
}: VotingPanelProps) {
  return (
    <Panel title={title}>
      {description && <p className="voting-panel-description">{description}</p>}
      <div className="voting-panel-words">
        {words.length > 0 ? (
          words.map((word) => (
            <label key={word.id} className="voting-panel-word-label">
              <input
                type="checkbox"
                checked={voteSet.has(word.id)}
                onChange={() => onToggleVote(word.id)}
                disabled={hasVoted}
                className="voting-panel-checkbox"
              />
              <span>👎</span>
              <span className="voting-panel-word-text">
                {word.word}
                {showCategory && word.category && ` (${word.category})`}
              </span>
            </label>
          ))
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
        {hasVoted ? 'Votes Submitted' : 'Submit Downvotes'}
      </button>
      {voteStatus && <p className="voting-panel-status">{voteStatus}</p>}
    </Panel>
  );
}
