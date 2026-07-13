import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NineDashActivePanel } from './components/NineDashActivePanel';
import { NineDashResults } from './components/NineDashResults';
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
import './NineDashGame.css';

interface NineDashGameProps extends GameProps {
  serverState: CategoryClashState;
}

/** Round timer effect for Nine Dash. Updates countdown display and timeUp flag. */
function useRoundTimer(
  round: CategoryClashState['round'],
  playerId: string,
  clearCountdown: () => void,
  countdownTimerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
  notifyFinish: (roundId: number) => void,
  setCountdown: React.Dispatch<React.SetStateAction<string>>,
) {
  const [timeUp, setTimeUp] = useState(false);
  const [roundId, setRoundId] = useState<number | null>(null);

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
  }, [round.id, round.state, round.durationMs, playerId, roundId, clearCountdown, countdownTimerRef, notifyFinish, setCountdown]);

  return { timeUp, setTimeUp };
}

/** Main game component for Nine Dash. */
export function NineDashGame({
  serverState,
  connection,
  playerId,
  playerName,
  accessKey,
  isAdmin,
  isParticipating,
  setShowConfig,
}: NineDashGameProps) {
  const [countdown, setCountdown] = useState('');
  const [wordInput, setWordInput] = useState('');
  const [flash, setFlash] = useState('');
  const [voteSet, setVoteSet] = useState<Set<string>>(new Set());
  const [voteStatus, setVoteStatus] = useState('');
  const [status, setStatus] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | ''>('');

  const { flashTimerRef, countdownTimerRef } = useTimerRefs();
  const finishSentRef = useRef<Set<number>>(new Set());

  const triggerFlash = useFlashTrigger(flashTimerRef, setFlash);
  const clearCountdown = useClearCountdown(countdownTimerRef, setCountdown);
  const notifyFinish = useNotifyFinish(playerId, accessKey, finishSentRef);

  const { timeUp } = useRoundTimer(
    serverState.round, playerId, clearCountdown, countdownTimerRef, notifyFinish, setCountdown,
  );

  const round = serverState.round;
  const letters = round.letters || [];
  const sourceWord = round.sourceWord || '';
  const scoresByPlayer = round.scoresByPlayer || {};
  const myScore = playerId ? scoresByPlayer[playerId] || 0 : 0;
  const hasVoted = round.votesSubmittedIds?.includes(playerId) || false;
  const results = round.resultsByPlayer?.[playerId] || null;

  const scoreboard = useMemo(() => buildScoreboard(round.resultsByPlayer), [round.resultsByPlayer]);

  const myWords = useMemo(() => {
    const myGroup = (round.wordsByPlayer || []).find((group) => group.playerId === playerId);
    return (myGroup?.words || []).map((entry) => ({ id: entry.id, word: entry.word }));
  }, [round.wordsByPlayer, playerId]);

  const myWordIds = useMemo(() => new Set(myWords.map((entry) => entry.id)), [myWords]);

  const voteWords = useMemo(
    () => (round.anonymousWords || []).filter((word) => !myWordIds.has(word.id)),
    [round.anonymousWords, myWordIds]
  );

  useEffect(() => {
    setStatus('');
    setSubmitStatus('');
    setVoteStatus('');
  }, [round.id]);

  useEffect(() => {
    if (round.state !== 'voting') {
      setVoteSet(new Set());
    }
  }, [round.id, round.state]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      clearCountdown();
    };
  }, [flashTimerRef, clearCountdown]);

  const onPlayAgain = useCallback(async () => {
    setActionStatus('');
    const result = await handlePlayAgain(round.durationMs!, accessKey);
    setActionStatus(result.statusMessage);
    if (result.success) {
      setShowConfig(false);
    }
  }, [round.durationMs, accessKey, setShowConfig]);

  const onWordSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');
    setSubmitStatus('');

    if (timeUp) {
      triggerFlash('error');
      setStatus('Time is up.');
      setSubmitStatus('error');
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
    setSubmitStatus(result.success ? 'success' : 'error');
    if (result.success) {
      setWordInput('');
    }
  }, [timeUp, triggerFlash, playerId, accessKey, wordInput, letters]);

  const handleWordInputChange = useCallback((value: string) => {
    setWordInput(value);
    setSubmitStatus('');
  }, []);

  const onToggleVote = useCallback((wordId: string) => {
    setVoteSet((prev) => toggleVoteSelection(prev, wordId));
  }, []);

  const onVoteSubmit = useCallback(async () => {
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
  }, [playerId, accessKey, voteSet, triggerFlash]);

  const showView = letters.length > 0 && ['active', 'voting', 'results'].includes(round.state);
  if (!showView) return null;

  const statusMessage = status || (timeUp ? 'Time is up. Waiting for others...' : '');

  return (
    <div className={flash ? `flash-${flash}` : ''}>
      {round.state === 'active' && (
        <NineDashActivePanel
          letters={letters}
          countdown={countdown}
          statusMessage={statusMessage}
          connection={connection}
          playerName={playerName}
          myScore={myScore}
          myWords={myWords}
          isParticipating={isParticipating}
          timeUp={timeUp}
          wordInput={wordInput}
          submitStatus={submitStatus}
          onWordInputChange={handleWordInputChange}
          onWordSubmit={onWordSubmit}
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
        <NineDashResults
          scoreboard={scoreboard}
          results={results}
          playerId={playerId}
          sourceWord={sourceWord}
          isAdmin={isAdmin}
          actionStatus={actionStatus}
          onPlayAgain={onPlayAgain}
          onBackToConfig={() => setShowConfig(true)}
        />
      )}
    </div>
  );
}
