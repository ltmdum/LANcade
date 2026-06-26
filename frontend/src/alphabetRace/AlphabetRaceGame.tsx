import React, { useState, useEffect } from 'react';
import { Panel } from '../shared/components/Panel';
import { PlayAgainPanel } from '../shared/components/PlayAgainPanel';
import { RacingPanel } from './components/RacingPanel';
import { AlphabetVotingPanel } from './components/AlphabetVotingPanel';
import { LetterProgress } from './components/LetterProgress';
import { AlphabetScoreBoard } from './components/AlphabetScoreBoard';
import { AlphabetWinnerDisplay } from './components/AlphabetWinnerDisplay';
import { submitWord } from '../shared/utils/api';
import { handleVoteSubmit } from '../shared/utils/voting';
import { handlePlayAgain } from '../shared/utils/roundActions';
import { useTimerRefs, useFlashTrigger } from '../shared/hooks/useGameUtils';
import type { GameProps } from '../shared/types/GameProps';
import type { AlphabetRaceState, AlphabetRaceMatchState, PlayerInfo } from '@lancade/shared';
import './AlphabetRaceGame.css';

interface AlphabetRaceGameProps extends GameProps {
  serverState: AlphabetRaceState;
}

/**
 * Derive computed state from server state and player info.
 * @param match Current match state.
 * @param playerId Current player ID.
 * @returns Computed booleans for rendering decisions.
 */
function deriveMatchFlags(match: AlphabetRaceState['match'], playerId: string) {
  return {
    isParticipant: !!playerId && match.participants.includes(playerId),
    isIneligible: !!playerId && match.ineligiblePlayerIds.includes(playerId),
    isSubmitter: !!playerId && match.submittedBy === playerId,
    hasVoted: playerId ? match.votedPlayerIds.includes(playerId) : false,
  };
}

/**
 * Alphabet Race gameplay surface.
 * Orchestrates racing, voting, and finished phases.
 * @param props Game props from the plugin.
 * @returns Alphabet Race game element.
 */
export function AlphabetRaceGame({
  serverState,
  playerId,
  accessKey,
  isAdmin,
  isParticipating,
  setShowConfig,
}: AlphabetRaceGameProps) {
  const [wordInput, setWordInput] = useState('');
  const [status, setStatus] = useState('');
  const [voteStatus, setVoteStatus] = useState('');
  const [flash, setFlash] = useState('');
  const [adminStatus, setAdminStatus] = useState('');
  const [clockSkewMs, setClockSkewMs] = useState(0);

  const { flashTimerRef } = useTimerRefs();
  const triggerFlash = useFlashTrigger(flashTimerRef, setFlash);

  const match = serverState.match;
  const players = serverState.players || [];
  const flags = deriveMatchFlags(match, playerId);

  useEffect(() => {
    if (!serverState.serverTime) return;
    setClockSkewMs(Date.now() - serverState.serverTime);
  }, [serverState.serverTime]);

  useEffect(() => {
    if (match.state !== 'voting') setVoteStatus('');
  }, [match.state, match.id]);

  useEffect(() => {
    return () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current); };
  }, [flashTimerRef]);

  if (match.state === 'idle') return null;

  return (
    <AlphabetRaceLayout
      match={match}
      players={players}
      playerId={playerId}
      isAdmin={isAdmin}
      flags={flags}
      flash={flash}
      status={status}
      voteStatus={voteStatus}
      adminStatus={adminStatus}
      clockSkewMs={clockSkewMs}
      wordInput={wordInput}
      onWordInputChange={setWordInput}
      onWordSubmit={buildWordSubmitHandler({ wordInput, playerId, accessKey, setStatus, setWordInput, triggerFlash })}
      onVote={buildVoteHandler({ playerId, accessKey, setVoteStatus, triggerFlash })}
      onRestart={buildRestartHandler({ match, accessKey, setAdminStatus, setShowConfig })}
      setShowConfig={setShowConfig}
      isParticipating={isParticipating}
    />
  );
}

interface WordSubmitHandlerConfig {
  wordInput: string;
  playerId: string;
  accessKey: string;
  setStatus: (s: string) => void;
  setWordInput: (s: string) => void;
  triggerFlash: (type: string) => void;
}

/**
 * Build the word submission handler function.
 * @param config Configuration for the handler.
 * @returns Form submit handler.
 */
function buildWordSubmitHandler(config: WordSubmitHandlerConfig) {
  return async (e: React.FormEvent) => {
    e.preventDefault();
    config.setStatus('');

    const trimmedWord = config.wordInput.trim();
    if (!trimmedWord) return;

    try {
      const { response, data } = await submitWord(config.playerId, trimmedWord, config.accessKey);
      if (response.ok) {
        config.triggerFlash('success');
        config.setStatus('Submitted. Waiting for votes...');
      } else {
        config.triggerFlash('error');
        config.setStatus(data.error || 'Could not submit word.');
      }
    } catch {
      config.triggerFlash('error');
      config.setStatus('Could not submit word.');
    }
    config.setWordInput('');
  };
}

interface VoteHandlerConfig {
  playerId: string;
  accessKey: string;
  setVoteStatus: (s: string) => void;
  triggerFlash: (type: string) => void;
}

/**
 * Build the vote submission handler function.
 * @param config Configuration for the handler.
 * @returns Vote handler function.
 */
function buildVoteHandler(config: VoteHandlerConfig) {
  return async (decision: 'accept' | 'reject') => {
    config.setVoteStatus('');
    const result = await handleVoteSubmit({
      playerId: config.playerId,
      accessKey: config.accessKey,
      payload: { decision },
      errorMessages: {
        notEligible: 'You are not eligible to vote.',
        alreadyVoted: 'You have already voted.',
        failed: 'Could not submit vote.',
      },
      successMessage: 'Vote submitted.',
    });

    if (!result.success) {
      config.triggerFlash('error');
    }
    config.setVoteStatus(result.statusMessage);
  };
}

interface RestartHandlerConfig {
  match: AlphabetRaceState['match'];
  accessKey: string;
  setAdminStatus: (s: string) => void;
  setShowConfig: (show: boolean) => void;
}

/**
 * Build the restart handler for playing again.
 * @param config Configuration for the handler.
 * @returns Restart handler function.
 */
function buildRestartHandler(config: RestartHandlerConfig) {
  return async () => {
    config.setAdminStatus('');
    const result = await handlePlayAgain(config.match.voteTimeoutMs, config.accessKey);
    config.setAdminStatus(result.statusMessage);
    if (result.success) {
      config.setShowConfig(false);
    }
  };
}

/** Computed match flags for the current player. */
interface MatchFlags {
  isParticipant: boolean;
  isIneligible: boolean;
  isSubmitter: boolean;
  hasVoted: boolean;
}

interface AlphabetRaceLayoutProps {
  match: AlphabetRaceMatchState;
  players: PlayerInfo[];
  playerId: string;
  isAdmin: boolean;
  isParticipating: boolean;
  flags: MatchFlags;
  flash: string;
  status: string;
  voteStatus: string;
  adminStatus: string;
  clockSkewMs: number;
  wordInput: string;
  onWordInputChange: (value: string) => void;
  onWordSubmit: (e: React.FormEvent) => void;
  onVote: (decision: 'accept' | 'reject') => void;
  onRestart: () => void;
  setShowConfig: (show: boolean) => void;
}

/**
 * Layout component for Alphabet Race rendering different panels per state.
 * @param props Layout props.
 * @returns Layout element.
 */
function AlphabetRaceLayout(props: AlphabetRaceLayoutProps) {
  const { match, players, isAdmin, isParticipating, flags } = props;

  if (!flags.isParticipant && !isAdmin) {
    return (
      <Panel title="Game in Progress">
        <p>Waiting for next game...</p>
      </Panel>
    );
  }

  return (
    <div className={props.flash ? `flash-${props.flash}` : ''}>
      <div className="alphabet-race-container">
        <PhasePanel match={match} flags={flags} isParticipating={isParticipating} props={props} />
        <LetterProgress
          letterSequence={match.letterSequence}
          currentLetterIndex={match.currentLetterIndex}
          completedCount={match.completedCount}
        />
        <AlphabetScoreBoard
          players={players}
          scores={match.scores}
          ineligiblePlayerIds={match.ineligiblePlayerIds}
          participants={match.participants}
        />
        {isAdmin && match.state === 'finished' && (
          <PlayAgainPanel
            onPlayAgain={props.onRestart}
            onBackToConfig={() => props.setShowConfig(true)}
            status={props.adminStatus}
            playAgainText="Play Again (Same Config)"
            title="Next Steps"
          />
        )}
      </div>
    </div>
  );
}

interface PhasePanelProps {
  match: AlphabetRaceMatchState;
  flags: MatchFlags;
  isParticipating: boolean;
  props: AlphabetRaceLayoutProps;
}

/**
 * Render the correct panel for the current match phase.
 * @param params Phase panel params.
 * @returns Phase-specific panel element or null.
 */
function PhasePanel({ match, flags, isParticipating, props }: PhasePanelProps) {
  if (match.state === 'racing') {
    return (
      <RacingPanel
        currentLetter={match.currentLetter}
        category={match.category}
        isEligible={!flags.isIneligible}
        isParticipating={isParticipating}
        wordInput={props.wordInput}
        statusMessage={props.status}
        onWordInputChange={props.onWordInputChange}
        onWordSubmit={props.onWordSubmit}
      />
    );
  }

  if (match.state === 'voting') {
    return (
      <AlphabetVotingPanel
        submittedWord={match.submittedWord}
        submittedByName={match.submittedByName}
        voteEndsAt={match.voteEndsAt}
        clockSkewMs={props.clockSkewMs}
        isSubmitter={flags.isSubmitter}
        isIneligible={flags.isIneligible}
        isParticipating={isParticipating}
        hasVoted={flags.hasVoted}
        voteStatus={props.voteStatus}
        votesAccept={match.votesAccept}
        votesReject={match.votesReject}
        eligibleVoterCount={match.eligibleVoterCount}
        onVote={props.onVote}
      />
    );
  }

  if (match.state === 'finished') {
    return <AlphabetWinnerDisplay winnerName={match.winnerName} />;
  }

  return null;
}
