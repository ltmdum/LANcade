import React, { useState, useEffect, useRef } from 'react';
import { Panel } from '../../shared/components/Panel';
import { UndercoverWordList } from './UndercoverWordList';
import type { UndercoverSubmission, UndercoverVoteRound } from '@lancade/shared';

interface UndercoverVotePanelProps {
  playerId: string;
  accessKey: string;
  participants: string[];
  submissions: UndercoverSubmission[];
  voteRounds: UndercoverVoteRound[];
  currentVoteRound: number;
  hasVoted: boolean;
  playerLookup: Record<string, string>;
}

export function UndercoverVotePanel({
  playerId,
  accessKey,
  participants,
  submissions,
  voteRounds,
  currentVoteRound,
  hasVoted,
  playerLookup,
}: UndercoverVotePanelProps) {
  const [selectedTarget, setSelectedTarget] = useState('');
  const [status, setStatus] = useState('');
  const voteRoundAtFetch = useRef(currentVoteRound);

  useEffect(() => {
    setStatus('');
    setSelectedTarget('');
  }, [currentVoteRound]);

  useEffect(() => {
    voteRoundAtFetch.current = currentVoteRound;
  }, [currentVoteRound]);

  async function handleVote(e: React.FormEvent) {
    e.preventDefault();
    setStatus('');

    if (!selectedTarget) {
      setStatus('Please select a player to vote for.');
      return;
    }

    try {
      const response = await fetch('/api/round/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          votes: { targetPlayerId: selectedTarget },
          key: accessKey,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.reason === 'already_voted' ? 'You have already voted.' : 'Could not submit vote.');
        return;
      }
      if (voteRoundAtFetch.current === currentVoteRound) {
        setStatus('Vote submitted!');
      }
    } catch {
      if (voteRoundAtFetch.current === currentVoteRound) {
        setStatus('Could not submit vote.');
      }
    }
  }

  return (
    <Panel title={`Vote - Round ${currentVoteRound}`}>
      <UndercoverWordList submissions={submissions} />
      <PreviousTallies voteRounds={voteRounds} playerLookup={playerLookup} />
      {hasVoted ? (
        <p className="undercover-turn-info">Vote submitted. Waiting for other votes...</p>
      ) : (
        <VoteForm
          participants={participants}
          playerId={playerId}
          playerLookup={playerLookup}
          selectedTarget={selectedTarget}
          onSelectTarget={setSelectedTarget}
          onSubmit={handleVote}
        />
      )}
      {status && <p className="undercover-turn-info">{status}</p>}
    </Panel>
  );
}

interface PreviousTalliesProps {
  voteRounds: UndercoverVoteRound[];
  playerLookup: Record<string, string>;
}

function PreviousTallies({ voteRounds, playerLookup }: PreviousTalliesProps) {
  if (voteRounds.length === 0) {
    return null;
  }

  const lastRound = voteRounds[voteRounds.length - 1];
  const allPlayers = lastRound.tally.map((e) => e.playerId);

  return (
    <div className="undercover-tally">
      {lastRound.isTie && (
        <p className="undercover-turn-info undercover-turn-info--active">
          Tie! Another round of voting needed.
        </p>
      )}
      <h4>Previous Votes for this Round</h4>
      <table className="undercover-submissions-table">
        <thead>
          <tr>
            <th>Player</th>
            {voteRounds.map((_, index) => (
              <th key={index}>Vote {index + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allPlayers.map((playerId) => {
            const playerName = playerLookup[playerId];
            return (
              <tr key={playerId}>
                <td>{playerName}</td>
                {voteRounds.map((round) => {
                  const entry = round.tally.find((e) => e.playerId === playerId);
                  return (
                    <td key={round === voteRounds[0] ? 0 : voteRounds.indexOf(round)}>
                      {entry ? `${entry.count} vote${entry.count !== 1 ? 's' : ''}` : '0 votes'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface VoteFormProps {
  participants: string[];
  playerId: string;
  playerLookup: Record<string, string>;
  selectedTarget: string;
  onSelectTarget: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function VoteForm({
  participants,
  playerId,
  playerLookup,
  selectedTarget,
  onSelectTarget,
  onSubmit,
}: VoteFormProps) {
  const votableParticipants = participants.filter((id) => id !== playerId);

  return (
    <form onSubmit={onSubmit}>
      <p className="undercover-turn-info undercover-turn-info--active">
        Who do you think is the Undercover Agent?
      </p>
      <div className="undercover-vote-options">
        {votableParticipants.map((id) => (
          <button
            key={id}
            type="button"
            className={`undercover-vote-card ${selectedTarget === id ? 'undercover-vote-card--selected' : ''}`}
            onClick={() => onSelectTarget(id)}
          >
            {playerLookup[id] || id}
          </button>
        ))}
      </div>
      <button type="submit" className="btn btn-primary">
        Submit Vote
      </button>
    </form>
  );
}
