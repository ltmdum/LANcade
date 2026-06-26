import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GridlockActivePanel } from './components/GridlockActivePanel';
import { GridlockResults } from './components/GridlockResults';
import { VotingPanel } from '../categoryclashshared/components/VotingPanel';
import { toggleVoteSelection } from '../categoryclashshared/utils/voting';
import { validateGridWord } from './utils/letters';
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
import { buildScoreboard } from '../categoryclashshared/utils/scoreboard';
import type { GameProps } from '../shared/types/GameProps';
import type { CategoryClashState } from '@lancade/shared';
import './GridlockGame.css';

interface GridlockGameProps extends GameProps {
  serverState: CategoryClashState;
}

/**
 * Gridlock gameplay surface: build as many words as possible from a 3x3 grid
 * of jumbled letters, then vote on other players' words.
 * @param props Game props from the plugin.
 * @returns Gridlock game element.
 */
export function GridlockGame({
  serverState,
  connection,
  playerId,
  playerName,
  accessKey,
  isAdmin,
  isParticipating,
  setShowConfig,
}: GridlockGameProps) {
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
  const letters = round.letters || [];
  const scoresByPlayer = round.scoresByPlayer || {};
  const myScore = playerId ? scoresByPlayer[playerId] || 0 : 0;
  const hasVoted = round.votesSubmittedIds?.includes(playerId) || false;
  const results = round.resultsByPlayer?.[playerId] || null;

  const scoreboard = useMemo(() => buildScoreboard(round.resultsByPlayer), [round.resultsByPlayer]);

  /** The current player's accepted words this round. */
  const myWords = useMemo(() => {
    const myGroup = (round.wordsByPlayer || []).find((group) => group.playerId === playerId);
    return (myGroup?.words || []).map((entry) => ({ id: entry.id, word: entry.word }));
  }, [round.wordsByPlayer, playerId]);

  const myWordIds = useMemo(() => new Set(myWords.map((entry) => entry.id)), [myWords]);

  /** Anonymous words the current player is allowed to vote on. */
  const voteWords = useMemo(
    () => (round.anonymousWords || []).filter((word) => !myWordIds.has(word.id)),
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
      setWordInput('');
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

    const result = await handleWordSubmission(wordInput, {
      playerId,
      accessKey,
      validate: (word) => validateGridWord(word, letters),
    });

    triggerFlash(result.success ? 'success' : 'error');
    setStatus(result.success ? 'Word accepted.' : result.statusMessage);
    if (result.success) {
      setWordInput('');
    }
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

  const showView = letters.length > 0 && ['active', 'voting', 'results'].includes(round.state);
  if (!showView) return null;

  const statusMessage = status || (timeUp ? 'Time is up. Waiting for others...' : '');

  return (
    <div className={flash ? `flash-${flash}` : ''}>
      {round.state === 'active' && (
        <GridlockActivePanel
          letters={letters}
          countdown={countdown}
          statusMessage={statusMessage}
          connection={connection}
          playerName={playerName}
          myScore={myScore}
          myWords={myWords}
          isAdmin={isAdmin}
          isParticipating={isParticipating}
          timeUp={timeUp}
          wordInput={wordInput}
          onWordInputChange={setWordInput}
          onWordSubmit={onWordSubmit}
          onNewGrid={onPlayAgain}
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
          title="Downvote Words You Disagree With"
          description="Reject words that are not valid."
          isParticipating={isParticipating}
        />
      )}

      {round.state === 'results' && (
        <GridlockResults
          scoreboard={scoreboard}
          results={results}
          playerId={playerId}
          isAdmin={isAdmin}
          actionStatus={actionStatus}
          onPlayAgain={onPlayAgain}
          onBackToConfig={() => setShowConfig(true)}
        />
      )}
    </div>
  );
}
