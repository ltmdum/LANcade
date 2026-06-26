import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PlayAgainPanel } from '../shared/components/PlayAgainPanel';
import { Panel } from '../shared/components/Panel';
import { QuickFireActivePanel } from './components/QuickFireActivePanel';
import { Leaderboard } from '../categoryclashshared/components/Leaderboard';
import { PlayerResultsTable } from '../categoryclashshared/components/PlayerResultsTable';
import { VotingPanel } from '../categoryclashshared/components/VotingPanel';
import { toggleVoteSelection } from '../categoryclashshared/utils/voting';
import { buildScoreboard } from '../categoryclashshared/utils/scoreboard';
import { formatMs } from '../shared/utils/time';
import { handleWordSubmission } from '../shared/utils/wordSubmission';
import { handleVoteSubmit } from '../shared/utils/voting';
import { handlePlayAgain } from '../shared/utils/roundActions';
import {
  useTimerRefs,
  useFlashTrigger,
  useClearCountdown,
  useNotifyFinish,
} from '../shared/hooks/useGameUtils';
import type { GameProps } from '../shared/types/GameProps';
import type { CategoryClashState } from '@lancade/shared';
import './QuickFireGame.css';

interface QuickFireGameProps extends GameProps {
  serverState: CategoryClashState;
}

/**
 * Category Clash v1 gameplay surface.
 * @param props Game props from the plugin.
 * @returns Category Clash v1 game element.
 */
export function QuickFireGame({
  serverState,
  connection,
  playerId,
  playerName,
  accessKey,
  isAdmin,
  isParticipating,
  setShowConfig,
}: QuickFireGameProps) {
  const [wordInput, setWordInput] = useState('');
  const [flash, setFlash] = useState('');
  const [countdown, setCountdown] = useState('');
  const [timeUp, setTimeUp] = useState(false);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [voteSet, setVoteSet] = useState<Set<string>>(new Set());
  const [voteStatus, setVoteStatus] = useState('');
  const [status, setStatus] = useState('');
  const [actionStatus, setActionStatus] = useState('');

  const { flashTimerRef, countdownTimerRef } = useTimerRefs();
  const finishSentRef = useRef<Set<number>>(new Set());

  const triggerFlash = useFlashTrigger(flashTimerRef, setFlash);
  const clearCountdown = useClearCountdown(countdownTimerRef, setCountdown);
  const notifyFinish = useNotifyFinish(playerId, accessKey, finishSentRef);

  const round = serverState.round;
  const scoresByPlayer = round.scoresByPlayer || {};
  const myScore = playerId ? scoresByPlayer[playerId] || 0 : 0;
  const hasVoted = round.votesSubmittedIds?.includes(playerId) || false;
  const results = round.resultsByPlayer?.[playerId] || null;

  const scoreboard = useMemo(() => buildScoreboard(round.resultsByPlayer), [round.resultsByPlayer]);

  /** IDs of words that belong to the current player, used to exclude them from the voting list. */
  const myWordIds = useMemo(() => {
    const myGroup = (round.wordsByPlayer || []).find((g) => g.playerId === playerId);
    return new Set((myGroup?.words || []).map((w) => w.id));
  }, [round.wordsByPlayer, playerId]);

  /** Anonymous words the current player is allowed to vote on. */
  const voteWords = useMemo(
    () => (round.anonymousWords || []).filter((w) => !myWordIds.has(w.id)),
    [round.anonymousWords, myWordIds]
  );

  useEffect(() => {
    if (!playerId || round.state !== 'active' || !round.durationMs) {
      clearCountdown();
      setTimeUp(false);
      return;
    }
    if (roundId !== round.id) {
      setRoundId(round.id);
      setTimeUp(false);
      const endsAt = Date.now() + round.durationMs;
      clearCountdown();
      setCountdown(formatMs(round.durationMs));
      countdownTimerRef.current = setInterval(() => {
        const remaining = endsAt - Date.now();
        if (remaining <= 0) {
          setCountdown('00:00');
          clearCountdown();
          setTimeUp(true);
          notifyFinish(round.id);
          return;
        }
        setCountdown(formatMs(remaining));
      }, 250);
    }
  }, [round.id, round.state, round.durationMs, playerId, roundId, clearCountdown, notifyFinish, countdownTimerRef]);

  useEffect(() => {
    if (round.state !== 'voting') {
      setVoteSet(new Set());
      setVoteStatus('');
    }
  }, [round.id, round.state]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      clearCountdown();
    };
  }, [flashTimerRef, clearCountdown]);

  async function onPlayAgain() {
    setActionStatus('');
    const result = await handlePlayAgain(round.durationMs!, accessKey);
    setActionStatus(result.statusMessage);
    if (result.success) {
      setShowConfig(false);
    }
  }

  async function onWordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('');

    if (timeUp) {
      triggerFlash('error');
      setStatus('Time is up.');
      setWordInput('');
      return;
    }

    // Letter must exist during active round
    if (!round.letter) {
      throw new Error('round.letter must exist during active round');
    }

    const result = await handleWordSubmission(wordInput, {
      playerId,
      accessKey,
      letter: round.letter,
    });

    triggerFlash(result.success ? 'success' : 'error');
    setStatus(result.statusMessage);
    setWordInput('');
  }

  function onToggleVote(wordId: string) {
    setVoteSet((prev) => toggleVoteSelection(prev, wordId));
  }

  async function onVoteSubmit() {
    setVoteStatus('');
    const result = await handleVoteSubmit({
      playerId,
      accessKey,
      payload: Array.from(voteSet),
      errorMessages: {
        notEligible: 'You must submit words to vote.',
        alreadyVoted: 'You have already voted.',
        failed: 'Could not submit votes.',
      },
      successMessage: 'Votes submitted.',
    });

    if (!result.success) {
      triggerFlash('error');
    }
    setVoteStatus(result.success ? 'Votes submitted. Waiting for others...' : result.statusMessage);
  }

  const showView = round.letter && ['active', 'voting', 'results'].includes(round.state);
  if (!showView) return null;

  const statusMessage = status || (timeUp ? 'Time is up. Waiting for others...' : '');

  return (
    <div className={flash ? `flash-${flash}` : ''}>
      {round.state === 'active' && (
        <QuickFireActivePanel
          letter={round.letter}
          countdown={countdown}
          statusMessage={statusMessage}
          connection={connection}
          playerName={playerName}
          myScore={myScore}
          isAdmin={isAdmin}
          isParticipating={isParticipating}
          timeUp={timeUp}
          wordInput={wordInput}
          onWordInputChange={setWordInput}
          onWordSubmit={onWordSubmit}
          onNewLetter={onPlayAgain}
        />
      )}

      {round.state === 'voting' && (
        <VotingPanel
          words={voteWords}
          voteSet={voteSet}
          onToggleVote={onToggleVote}
          onSubmitVotes={onVoteSubmit}
          hasVoted={hasVoted}
          voteStatus={voteStatus}
          isParticipating={isParticipating}
        />
      )}

      {round.state === 'results' && (
        <>
          {!results ? (
            <Panel title="Results">
              <p>No results — nobody submitted any words this round.</p>
            </Panel>
          ) : (
            <>
              <Leaderboard entries={scoreboard} currentPlayerId={playerId} />
              <PlayerResultsTable words={results.words} />
            </>
          )}
          {isAdmin && (
            <PlayAgainPanel
              onPlayAgain={onPlayAgain}
              onBackToConfig={() => setShowConfig(true)}
              status={actionStatus}
            />
          )}
        </>
      )}
    </div>
  );
}
