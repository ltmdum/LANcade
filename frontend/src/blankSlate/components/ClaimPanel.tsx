import { useState } from 'react';
import { Panel } from '../../shared/components/Panel';
import { submitWord, finishRound } from '../../shared/utils/api';
import type { BlankSlateSubmission } from '@lancade/shared';
import './ClaimPanel.css';

interface ClaimPanelProps {
  playerId: string;
  playerPassword: string;
  canMakeClaim: boolean;
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
  submissions,
  playerSubmission,
  roundId,
}: ClaimPanelProps) {
  const [status, setStatus] = useState('');
  const [claimed, setClaimed] = useState(false);

  // Group submissions by word (case-insensitive)
  const groups = new Map<string, BlankSlateSubmission[]>();
  for (const sub of submissions) {
    const key = sub.word.toLowerCase();
    const existing = groups.get(key) || [];
    existing.push(sub);
    groups.set(key, existing);
  }

  // Filter out own word and find claimable targets
  const claimableGroups = Array.from(groups.entries())
    .filter(([key]) => {
      if (!playerSubmission) return false;
      return key !== playerSubmission.word.toLowerCase();
    })
    .map(([, subs]) => subs);

  async function handleClaim(targetWord: string) {
    setStatus('');
    try {
      // Submit the target word - in claiming phase this creates a claim
      const { response, data } = await submitWord(playerId, targetWord, playerPassword);
      if (!response.ok) {
        setStatus(data.reason === 'not_unique' ? 'Your word is not unique.' : 'Could not submit claim.');
        return;
      }
      setClaimed(true);
      setStatus('Claim submitted! Waiting for votes...');
    } catch {
      setStatus('Could not submit claim.');
    }
  }

  async function handleSkip() {
    setStatus('');
    try {
      const { response } = await finishRound(playerId, roundId, playerPassword);
      if (!response.ok) {
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
          Your word matched with others! Waiting for players with unique words to make claims...
        </p>
        <SubmissionList submissions={submissions} />
      </Panel>
    );
  }

  if (claimed) {
    return (
      <Panel title="Claim Phase">
        <p className="claim-panel-info">{status}</p>
        <SubmissionList submissions={submissions} />
      </Panel>
    );
  }

  return (
    <Panel title="Make a Claim">
      <p className="claim-panel-info">
        Your word "{playerSubmission?.word}" was unique. You can claim to have the same answer
        as another group, or skip.
      </p>
      <SubmissionList submissions={submissions} />
      <div className="claim-panel-options">
        <p className="claim-panel-prompt">Select a group to claim:</p>
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

/**
 * Display all submissions grouped by word.
 */
function SubmissionList({ submissions }: { submissions: BlankSlateSubmission[] }) {
  const groups = new Map<string, BlankSlateSubmission[]>();
  for (const sub of submissions) {
    const key = sub.word.toLowerCase();
    const existing = groups.get(key) || [];
    existing.push(sub);
    groups.set(key, existing);
  }

  return (
    <div className="submission-list">
      {Array.from(groups.entries()).map(([key, subs]) => (
        <div key={key} className="submission-group">
          <span className="submission-word">"{subs[0].word}"</span>
          <span className="submission-players">
            {subs.map((s) => s.playerName).join(', ')}
          </span>
        </div>
      ))}
    </div>
  );
}
