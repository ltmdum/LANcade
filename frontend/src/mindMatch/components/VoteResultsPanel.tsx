import { useMemo } from 'react';
import { Panel } from '../../shared/components/Panel';
import type { MindMatchClaim } from '@lancade/shared';
import './VoteResultsPanel.css';

interface VoteResultsPanelProps {
  claims: MindMatchClaim[];
  playerLookup: Record<string, string>;
  onShowResults: () => void;
  isAdmin: boolean;
  adminStatus: string;
}

interface ClaimBreakdown {
  claimantWord: string;
  targetWord: string;
  accepted: boolean;
  acceptVoters: string[];
  rejectVoters: string[];
}

export function VoteResultsPanel({
  claims,
  playerLookup,
  onShowResults,
  isAdmin,
  adminStatus,
}: VoteResultsPanelProps) {
  const involvedPlayers = useMemo(() => {
    const seen = new Set<string>();
    const result: { name: string; word: string }[] = [];
    for (const claim of claims) {
      for (const [pid, word] of Object.entries(claim.involvedPlayers || {})) {
        if (!seen.has(pid)) {
          seen.add(pid);
          result.push({ name: playerLookup[pid] || 'Unknown', word });
        }
      }
    }
    return result;
  }, [claims, playerLookup]);

  const breakdowns = useMemo(() => {
    return claims.map((claim): ClaimBreakdown => {
      const acceptVoters: string[] = [];
      const rejectVoters: string[] = [];
      for (const [pid, vote] of Object.entries(claim.votes)) {
        const name = playerLookup[pid] || 'Unknown';
        if (vote === 'accept') {
          acceptVoters.push(name);
        } else {
          rejectVoters.push(name);
        }
      }
      return {
        claimantWord: claim.claimantWord,
        targetWord: claim.targetWord,
        accepted: claim.accepted,
        acceptVoters,
        rejectVoters,
      };
    });
  }, [claims, playerLookup]);

  return (
    <Panel title="Claim Results">
      {breakdowns.length === 0 && (
        <p className="vote-results-empty">No claims were made this round.</p>
      )}

      {breakdowns.map((bd, i) => (
        <div key={i} className={`vote-results-claim ${bd.accepted ? 'accepted' : 'rejected'}`}>
          <div className={`vote-results-verdict-bar ${bd.accepted ? 'accepted' : 'rejected'}`}>
            {bd.accepted ? 'Accepted' : 'Rejected'}
          </div>
          <div className="vote-results-body">
            <div className="vote-results-equivalence">
              <strong>{bd.targetWord.toLowerCase()}</strong> ≡{' '}
              <strong>{bd.claimantWord.toLowerCase()}</strong>
            </div>
            <div className="vote-results-votes">
              <div className="vote-results-vote-row">
                <span className="vote-results-vote-row-label accept">Accept</span>
                <span>{bd.acceptVoters.join(', ') || '\u2014'}</span>
              </div>
              <div className="vote-results-vote-row">
                <span className="vote-results-vote-row-label reject">Reject</span>
                <span>{bd.rejectVoters.join(', ') || '\u2014'}</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {involvedPlayers.length > 0 && (
        <div className="vote-results-players">
          <p className="vote-results-players-heading">Original Words</p>
          {involvedPlayers.map((pv, j) => (
            <div key={j} className="vote-results-player">
              <span className="vote-results-player-name">{pv.name}</span>
              <span className="vote-results-player-word">{pv.word.toLowerCase()}</span>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="vote-results-admin">
          <button className="btn btn-primary" onClick={onShowResults}>
            Show Round Results
          </button>
          {adminStatus && <p className="vote-results-status">{adminStatus}</p>}
        </div>
      )}
    </Panel>
  );
}
