import { Panel } from '../../shared/components/Panel';
import { VoteCountdown } from '../../lastWordStanding/components/VoteCountdown';
import '../../alphabetRace/AlphabetRaceGame.css';

interface AlphabetVotingPanelProps {
  submittedWord: string | null;
  submittedByName: string | null;
  voteEndsAt: number | null;
  clockSkewMs: number;
  isSubmitter: boolean;
  isIneligible: boolean;
  hasVoted: boolean;
  voteStatus: string;
  votesAccept: number;
  votesReject: number;
  eligibleVoterCount: number;
  onVote: (decision: 'accept' | 'reject') => void;
}

/**
 * Voting panel for Alphabet Race word decisions.
 * Shows the submitted word and accept/reject buttons.
 * @param props Voting panel props.
 * @returns Voting panel element.
 */
export function AlphabetVotingPanel({
  submittedWord,
  submittedByName,
  voteEndsAt,
  clockSkewMs,
  isSubmitter,
  isIneligible,
  hasVoted,
  voteStatus,
  votesAccept,
  votesReject,
  eligibleVoterCount,
  onVote,
}: AlphabetVotingPanelProps) {
  if (isIneligible) {
    return (
      <Panel title="Vote on the Word">
        <p className="alphabet-vote-sitting-out">You are sitting out this letter.</p>
      </Panel>
    );
  }

  const totalVotes = votesAccept + votesReject;

  return (
    <Panel title="Vote on the Word">
      <div className="alphabet-vote-panel">
        <p className="alphabet-vote-submitter">{submittedByName || 'Unknown'} submitted:</p>
        <div className="alphabet-vote-word">{submittedWord || '-'}</div>
        {voteEndsAt && <VoteCountdown voteEndsAt={voteEndsAt} clockSkewMs={clockSkewMs} />}
        <VoteActions
          isSubmitter={isSubmitter}
          hasVoted={hasVoted}
          onVote={onVote}
        />
        <p className="alphabet-vote-counts">
          Votes: {totalVotes} / {eligibleVoterCount}
        </p>
        {voteStatus && <p className="alphabet-vote-status">{voteStatus}</p>}
      </div>
    </Panel>
  );
}

interface VoteActionsProps {
  isSubmitter: boolean;
  hasVoted: boolean;
  onVote: (decision: 'accept' | 'reject') => void;
}

/**
 * Accept/Reject button group for voting.
 * Shows waiting message for the submitter.
 * @param props Vote actions props.
 * @returns Vote actions element.
 */
function VoteActions({ isSubmitter, hasVoted, onVote }: VoteActionsProps) {
  if (isSubmitter) {
    return <p className="alphabet-vote-waiting">Waiting for votes...</p>;
  }

  return (
    <div className="alphabet-vote-buttons">
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
  );
}
