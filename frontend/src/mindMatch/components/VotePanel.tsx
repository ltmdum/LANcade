import { useState } from 'react';
import { Panel } from '../../shared/components/Panel';
import { handleVoteSubmit } from '../../shared/utils/voting';
import type { MindMatchClaim } from '@lancade/shared';
import './VotePanel.css';

interface VotePanelProps {
  playerId: string;
  playerPassword: string;
  claims: MindMatchClaim[];
  currentClaimIndex: number;
  playerLookup: Record<string, string>;
}

/**
 * Panel for voting on claims.
 * @param props Vote panel props.
 * @returns Vote panel element.
 */
export function VotePanel({
  playerId,
  playerPassword,
  claims,
  currentClaimIndex,
  playerLookup,
}: VotePanelProps) {
  const [status, setStatus] = useState('');

  const currentClaim = claims[currentClaimIndex];
  if (!currentClaim) {
    return (
      <Panel title="Voting">
        <p className="vote-panel-info">No claim to vote on.</p>
      </Panel>
    );
  }

  const isClaimant = currentClaim.claimantId === playerId;
  const isTarget = currentClaim.targetPlayerIds.includes(playerId);
  const isInvolvedInMutual = currentClaim.isMutual && (isClaimant || isTarget);
  const hasVoted = playerId in currentClaim.votes;
  const targetPlayerNames = currentClaim.targetPlayerIds
    .map((id) => playerLookup[id] || 'Unknown')
    .join(', ');

  async function onVote(decision: 'accept' | 'reject') {
    setStatus('');
    const result = await handleVoteSubmit({
      playerId,
      playerPassword,
      payload: { decision },
      errorMessages: {
        notEligible: 'You cannot vote on your own claim.',
        alreadyVoted: 'You have already voted.',
        failed: 'Could not submit vote.',
      },
      successMessage: 'Vote submitted.',
    });
    setStatus(result.statusMessage);
  }

  /**
   * Render the voting controls or status message.
   */
  function renderVotingSection() {
    if (isInvolvedInMutual) {
      return (
        <p className="vote-panel-waiting">
          You both claimed each other's words. Waiting for others to vote...
        </p>
      );
    }
    if (isClaimant) {
      return <p className="vote-panel-waiting">Waiting for others to vote...</p>;
    }
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
          <strong>{currentClaim.claimantName}</strong> answered{' '}
          <strong>"{currentClaim.claimantWord}"</strong> and claims it means the same as{' '}
          <strong>"{currentClaim.targetWord}"</strong>
        </p>
        <p className="vote-panel-target">
          (submitted by {targetPlayerNames})
        </p>
        {currentClaim.isMutual && (
          <p className="vote-panel-mutual">Both players claimed each other's words!</p>
        )}
      </div>

      {renderVotingSection()}

      <div className="vote-panel-tally">
        Votes: {Object.keys(currentClaim.votes).length} submitted
      </div>

      {status && <p className="vote-panel-status">{status}</p>}
    </Panel>
  );
}
