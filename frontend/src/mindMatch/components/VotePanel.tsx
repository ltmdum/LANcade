import { Panel } from '../../shared/components/Panel';
import { handleVoteSubmit } from '../../shared/utils/voting';
import type { MindMatchClaim } from '@lancade/shared';
import './VotePanel.css';

interface VotePanelProps {
  playerId: string;
  accessKey: string;
  claims: MindMatchClaim[];
  currentClaimIndex: number;
}

export function VotePanel({
  playerId,
  accessKey,
  claims,
  currentClaimIndex,
}: VotePanelProps) {
  const currentClaim = claims[currentClaimIndex];
  if (!currentClaim) {
    return (
      <Panel title="Voting">
        <p className="vote-panel-info">No claim to vote on.</p>
      </Panel>
    );
  }

  const hasVoted = playerId in currentClaim.votes;

  async function onVote(decision: 'accept' | 'reject') {
    await handleVoteSubmit({
      playerId,
      accessKey,
      payload: { decision },
      errorMessages: {
        notEligible: 'You cannot vote on your own claim.',
        alreadyVoted: 'You have already voted.',
        failed: 'Could not submit vote.',
      },
      successMessage: '',
    });
  }

  function renderVotingSection() {
    if (hasVoted) {
      return <p className="vote-panel-waiting">Vote submitted. Waiting for others...</p>;
    }
    return (
      <div className="vote-panel-buttons">
        <button className="btn btn-success" onClick={() => onVote('accept')}>
          Accept
        </button>
        <button className="btn btn-danger" onClick={() => onVote('reject')}>
          Reject
        </button>
      </div>
    );
  }

  return (
    <Panel title="Vote on Claim">
      <div className="vote-panel-claim">
        <p className="vote-panel-question">
          A claim has been made that{' '}
          <strong>"{currentClaim.targetWord}"</strong> is equivalent to{' '}
          <strong>"{currentClaim.claimantWord}"</strong>
        </p>
      </div>

      {renderVotingSection()}
    </Panel>
  );
}
