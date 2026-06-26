import { Panel } from '../../shared/components/Panel';
import { VoteCountdown } from './VoteCountdown';
import './LastWordStandingVotingPanel.css';

interface LastWordStandingVotingPanelProps {
  pendingWord: string;
  pendingWordPlayer: string;
  voteEndsAt: number | null | undefined;
  clockSkewMs: number;
  isCurrentPlayer: boolean;
  hasVoted: boolean;
  voteStatus: string;
  onVote: (decision: 'accept' | 'reject') => void;
  isParticipating?: boolean;
}

/**
 * Voting panel for Last Word Standing decisions.
 * @param props Voting panel props.
 * @returns Voting panel element.
 */
export function LastWordStandingVotingPanel({
  pendingWord,
  pendingWordPlayer,
  voteEndsAt,
  clockSkewMs,
  isCurrentPlayer,
  hasVoted,
  voteStatus,
  onVote,
  isParticipating = true,
}: LastWordStandingVotingPanelProps) {
  return (
    <Panel title="Vote on the Word">
      <p className="wordrush-voting-submitter">{pendingWordPlayer} submitted:</p>
      <div className="wordrush-voting-word">{pendingWord || '-'}</div>
      {voteEndsAt && <VoteCountdown voteEndsAt={voteEndsAt} clockSkewMs={clockSkewMs} />}
      {isParticipating && (
        isCurrentPlayer ? (
          <p className="wordrush-voting-waiting">Waiting for votes...</p>
        ) : (
          <div className="wordrush-voting-buttons">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onVote('accept')}
              disabled={hasVoted}
            >
              {hasVoted ? 'Vote Submitted' : 'Accept'}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onVote('reject')}
              disabled={hasVoted}
            >
              Reject
            </button>
          </div>
        )
      )}
      {voteStatus && <p className="wordrush-voting-status">{voteStatus}</p>}
    </Panel>
  );
}
