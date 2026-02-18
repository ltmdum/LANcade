import { useState } from 'react';
import { Panel } from '../../shared/components/Panel';
import { submitWord, finishRound } from '../../shared/utils/api';
import type { BlankSlateSubmission } from '@lancade/shared';
import './ClaimPanel.css';

interface ClaimPanelProps {
  playerId: string;
  playerPassword: string;
  canMakeClaim: boolean;
  claimableTargets: string[];
  submissions: BlankSlateSubmission[];
  playerSubmission?: BlankSlateSubmission;
  roundId: number;
}

/**
 * Panel for claiming to have the same word as another group.
 * @param props Claim panel props.
 * @returns Claim panel element.
 */
export function ClaimPanel({
  playerId,
  playerPassword,
  canMakeClaim,
  claimableTargets,
  submissions,
  playerSubmission,
  roundId,
}: ClaimPanelProps) {
  const [status, setStatus] = useState('');
  const [claimed, setClaimed] = useState(false);

  // Group submissions by word (case-insensitive) to get player counts
  const groups = new Map<string, BlankSlateSubmission[]>();
  for (const sub of submissions) {
    const key = sub.word.toLowerCase();
    const existing = groups.get(key) || [];
    existing.push(sub);
    groups.set(key, existing);
  }

  // Build claimable groups from server-provided targets
  const claimableGroups: BlankSlateSubmission[][] = [];
  for (const targetWord of claimableTargets) {
    const key = targetWord.toLowerCase();
    const group = groups.get(key);
    if (group) {
      claimableGroups.push(group);
    }
  }

  async function handleClaim(targetWord: string) {
    setStatus('');
    try {
      const { response, data } = await submitWord(playerId, targetWord, playerPassword);
      if (!response.ok) {
        const reason = data.reason;
        if (reason === 'target_not_similar_enough') {
          setStatus('That word is not similar enough to claim.');
        } else if (reason === 'already_claimed') {
          setStatus('You have already made a claim.');
        } else if (reason === 'no_claimable_targets') {
          setStatus('You have no words similar enough to claim.');
        } else {
          setStatus('Could not submit claim.');
        }
        return;
      }
      setClaimed(true);
      setStatus('Claim submitted! Waiting for other players...');
    } catch {
      setStatus('Could not submit claim.');
    }
  }

  async function handleSkip() {
    setStatus('');
    try {
      const { response, data } = await finishRound(playerId, roundId, playerPassword);
      if (!response.ok) {
        const reason = data?.reason;
        if (reason === 'no_action_required') {
          return;
        }
        setStatus('Could not skip.');
        return;
      }
      setClaimed(true);
      setStatus('Skipped claiming.');
    } catch {
      setStatus('Could not skip.');
    }
  }

  if (!canMakeClaim) {
    return (
      <Panel title="Claim Phase">
        <p className="claim-panel-info">
          Waiting for players with unique words to make claims...
        </p>
      </Panel>
    );
  }

  if (claimed) {
    return (
      <Panel title="Claim Phase">
        <p className="claim-panel-info">{status}</p>
      </Panel>
    );
  }

  return (
    <Panel title="Make a Claim">
      <p className="claim-panel-info">
        Your word "{playerSubmission?.word}" was unique. Select a similar word to claim,
        or skip if none apply.
      </p>
      <div className="claim-panel-options">
        {claimableGroups.map((group) => (
          <button
            key={group[0].word}
            className="btn btn-secondary claim-panel-option"
            onClick={() => handleClaim(group[0].word)}
          >
            Claim "{group[0].word}" ({group.length} player{group.length !== 1 ? 's' : ''})
          </button>
        ))}
        <button className="btn btn-outline claim-panel-skip" onClick={handleSkip}>
          Skip (no claim)
        </button>
      </div>
      {status && <p className="claim-panel-status">{status}</p>}
    </Panel>
  );
}
