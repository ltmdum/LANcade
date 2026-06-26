import React, { useState } from 'react';
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

/**
 * Panel for voting on who the undercover agent is.
 * Shows word list, previous vote tallies, and a vote form.
 * @param props Vote panel props.
 * @returns Vote panel element.
 */
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

  /**
   * Submit the vote to the server.
   */
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
      setStatus('Vote submitted!');
    } catch {
      setStatus('Could not submit vote.');
    }
  }

  return (
    <Panel title={`Vote - Round ${currentVoteRound + 1}`}>
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

/**
 * Display tallies from previous vote rounds.
 * @param props Previous tallies props.
 * @returns Tally display element or null if no previous rounds.
 */
function PreviousTallies({ voteRounds, playerLookup }: PreviousTalliesProps) {
  if (voteRounds.length === 0) {
    return null;
  }

  return (
    <div className="undercover-tally">
      <h4>Previous Vote Rounds</h4>
      {voteRounds.map((round, index) => (
        <div key={index}>
          <strong>Round {index + 1}</strong>
          {round.tally.map((entry) => (
            <div key={entry.playerId} className="undercover-tally-bar">
              <span className="undercover-tally-name">
                {playerLookup[entry.playerId] || entry.playerName}
              </span>
              <span className="undercover-tally-count">{entry.count} votes</span>
            </div>
          ))}
          {!round.isUnanimous && (
            <p className="undercover-round-info">No unanimous vote - another round needed.</p>
          )}
        </div>
      ))}
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

/**
 * Form with radio buttons for selecting a player to vote for.
 * @param props Vote form props.
 * @returns Vote form element.
 */
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
