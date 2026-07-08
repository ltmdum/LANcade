import React, { useState, useEffect, useMemo } from 'react';
import { Panel } from '../shared/components/Panel';
import { PlayAgainPanel } from '../shared/components/PlayAgainPanel';
import { LastWordStandingActivePanel } from './components/LastWordStandingActivePanel';
import { LastWordStandingVotingPanel } from './components/LastWordStandingVotingPanel';
import { PlayerTagList } from './components/PlayerTagList';
import { WinnerDisplay } from './components/WinnerDisplay';
import { formatMs } from '../shared/utils/time';
import { handleWordSubmission } from '../shared/utils/wordSubmission';
import { handleVoteSubmit } from '../shared/utils/voting';
import { handlePlayAgain } from '../shared/utils/roundActions';
import { useTimerRefs, useFlashTrigger, useClearCountdown } from '../shared/hooks/useGameUtils';
import type { GameProps } from '../shared/types/GameProps';
import type { LastWordStandingState } from '@lancade/shared';
import './LastWordStandingGame.css';

interface LastWordStandingGameProps extends GameProps {
  serverState: LastWordStandingState;
}

/**
 * Last Word Standing gameplay surface.
 * @param props Game props from the plugin.
 * @returns Last Word Standing game element.
 */
export function LastWordStandingGame({
  serverState,
  connection,
  playerId,
  playerName,
  accessKey,
  isAdmin,
  isParticipating,
  setShowConfig,
}: LastWordStandingGameProps) {
  const [wordInput, setWordInput] = useState('');
  const [status, setStatus] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | ''>('');
  const [voteStatus, setVoteStatus] = useState('');
  const [countdown, setCountdown] = useState('');
  const [timeUp, setTimeUp] = useState(false);
  const [flash, setFlash] = useState('');
  const [clockSkewMs, setClockSkewMs] = useState(0);
  const [adminStatus, setAdminStatus] = useState('');

  const { flashTimerRef, countdownTimerRef } = useTimerRefs();

  const triggerFlash = useFlashTrigger(flashTimerRef, setFlash);
  const clearCountdown = useClearCountdown(countdownTimerRef, setCountdown);

  const match = serverState.match;
  const players = serverState.players || [];

  const playerLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    for (const player of players) {
      lookup[player.id] = player.name;
    }
    return lookup;
  }, [players]);

  const isCurrentPlayer = playerId && match.currentPlayerId === playerId;
  const eliminatedIds = match.eliminatedPlayerIds || [];
  const isEliminated = playerId && eliminatedIds.includes(playerId);
  const isInMatch = !playerId || match.order.includes(playerId);
  const currentPlayerName = match.currentPlayerId ? playerLookup[match.currentPlayerId] || 'Unknown' : '-';
  const pendingWord = match.pendingWord?.word || '';
  const pendingWordPlayer = match.pendingWord ? playerLookup[match.pendingWord.playerId] || 'Unknown' : '';
  const hasVoted = match.votes?.submittedIds?.includes(playerId) || false;

  useEffect(() => {
    if (!serverState.serverTime) return;
    setClockSkewMs(Date.now() - serverState.serverTime);
  }, [serverState.serverTime]);

  useEffect(() => {
    if (match.state !== 'active' || !match.turnEndsAt) {
      clearCountdown();
      setTimeUp(false);
      return;
    }

    const endsAt = match.turnEndsAt + clockSkewMs;
    setTimeUp(false);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(formatMs(Math.max(0, endsAt - Date.now())));
    countdownTimerRef.current = setInterval(() => {
      const remaining = endsAt - Date.now();
      if (remaining <= 0) {
        setCountdown('00:00');
        clearCountdown();
        setTimeUp(true);
        return;
      }
      setCountdown(formatMs(remaining));
    }, 250);

    return () => clearCountdown();
  }, [match.state, match.turnEndsAt, clockSkewMs, clearCountdown, countdownTimerRef]);

  useEffect(() => {
    setStatus('');
    setSubmitStatus('');
    if (match.state !== 'voting') {
      setVoteStatus('');
    }
  }, [match.state, match.id]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      clearCountdown();
    };
  }, [flashTimerRef, clearCountdown]);

  async function onWordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('');
    setSubmitStatus('');

    if (!match.currentLetter) {
      throw new Error('match.currentLetter must exist during active match');
    }

    const result = await handleWordSubmission(wordInput, {
      playerId,
      accessKey,
      letter: match.currentLetter,
    });

    triggerFlash(result.success ? 'success' : 'error');
    setStatus(result.success ? 'Submitted. Waiting for votes...' : result.statusMessage);
    setSubmitStatus(result.success ? 'success' : 'error');
    setWordInput('');
  }

  function handleWordInputChange(value: string) {
    setWordInput(value);
    setSubmitStatus('');
  }

  async function onVote(decision: 'accept' | 'reject') {
    setVoteStatus('');
    const result = await handleVoteSubmit({
      playerId,
      accessKey,
      payload: { decision },
      errorMessages: {
        notEligible: 'You are not eligible to vote.',
        alreadyVoted: 'You have already voted.',
        failed: 'Could not submit vote.',
      },
      successMessage: 'Vote submitted.',
    });

    if (!result.success) {
      triggerFlash('error');
    }
    setVoteStatus(result.statusMessage);
  }

  async function onRestart() {
    setAdminStatus('');
    const result = await handlePlayAgain(match.timeLimitMs!, accessKey);
    setAdminStatus(result.statusMessage);
    if (result.success) {
      setShowConfig(false);
    }
  }

  if (match.state === 'idle') return null;

  if (!isInMatch && !isAdmin) {
    return (
      <Panel title="Game in Progress">
        <p>Waiting for next game...</p>
      </Panel>
    );
  }

  const statusMessage = status || (timeUp ? 'Time is up. Waiting for update...' : '');
  const winnerName = match.winnerId ? playerLookup[match.winnerId] || 'Unknown' : '-';

  return (
    <div className={flash ? `flash-${flash}` : ''}>
      {match.state === 'active' && (
        <LastWordStandingActivePanel
          playerName={playerName}
          currentPlayerName={currentPlayerName}
          lastChance={match.lastChance}
          letter={match.currentLetter}
          countdown={countdown}
          statusMessage={statusMessage}
          connection={connection}
          isCurrentPlayer={!!isCurrentPlayer}
          isEliminated={!!isEliminated}
          isParticipating={isParticipating}
          wordInput={wordInput}
          submitStatus={submitStatus}
          onWordInputChange={handleWordInputChange}
          onWordSubmit={onWordSubmit}
        />
      )}

      {match.state === 'voting' && (
        <LastWordStandingVotingPanel
          pendingWord={pendingWord}
          pendingWordPlayer={pendingWordPlayer}
          voteEndsAt={match.votes?.voteEndsAt}
          clockSkewMs={clockSkewMs}
          isCurrentPlayer={!!isCurrentPlayer}
          hasVoted={hasVoted}
          voteStatus={voteStatus}
          onVote={onVote}
          isParticipating={isParticipating}
        />
      )}

      {match.state === 'finished' && <WinnerDisplay winnerName={winnerName} />}

      <PlayerTagList players={players.filter((p) => match.order.includes(p.id))} eliminatedIds={eliminatedIds} />

      {isAdmin && match.state === 'finished' && (
        <PlayAgainPanel
          onPlayAgain={onRestart}
          onBackToConfig={() => setShowConfig(true)}
          status={adminStatus}
          playAgainText="Play Again (Same Config)"
          title="Next Steps"
        />
      )}
    </div>
  );
}
