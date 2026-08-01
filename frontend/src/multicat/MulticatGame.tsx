import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PlayAgainPanel } from '../shared/components/PlayAgainPanel';
import { Panel } from '../shared/components/Panel';
import { VolumeNotice } from '../shared/components/VolumeNotice';
import { ScoreBoard } from '../shared/components/ScoreBoard';
import { PlayerResults } from '../categoryclashshared/components/PlayerResults';
import { VotingPanel } from '../categoryclashshared/components/VotingPanel';
import { MulticatActivePanel } from './components/MulticatActivePanel';
import { toggleVoteSelection } from '../categoryclashshared/utils/voting';
import { formatMs } from '../shared/utils/time';
import { handleWordSubmission } from '../shared/utils/wordSubmission';
import { handleVoteSubmit } from '../shared/utils/voting';
import { handlePlayAgain } from '../shared/utils/roundActions';
import { playWarningSound, playOkaySound, playWinSound } from '../shared/utils/sounds';
import { buildWinnerMessage } from '../shared/utils/winnerMessage';
import confetti from 'canvas-confetti';
import {
  useTimerRefs,
  useFlashTrigger,
  useClearCountdown,
  useNotifyFinish,
} from '../shared/hooks/useGameUtils';
import { useCountdownTick } from '../shared/hooks/useCountdownTick';
import type { GameProps } from '../shared/types/GameProps';
import type { CategoryClashState } from '@lancade/shared';
import './MulticatGame.css';

interface MulticatGameProps extends GameProps {
  serverState: CategoryClashState;
}

/**
 * Category Clash v2 gameplay surface.
 * @param props Game props from the plugin.
 * @returns Category Clash v2 game element.
 */
export function MulticatGame({
  serverState,
  connection,
  playerId,
  playerName,
  accessKey,
  isAdmin,
  isParticipating,
  setShowConfig,
}: MulticatGameProps) {
  const [wordInputs, setWordInputs] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState('');
  const [countdown, setCountdown] = useState('');
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [voteSet, setVoteSet] = useState<Set<string>>(new Set());
  const [voteStatus, setVoteStatus] = useState('');
  const [status, setStatus] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | ''>('');
  const [actionStatus, setActionStatus] = useState('');
  const [failedCategories, setFailedCategories] = useState<Set<string>>(new Set());

  const { flashTimerRef, countdownTimerRef } = useTimerRefs();
  const finishSentRef = useRef<Set<number>>(new Set());

  const triggerFlash = useFlashTrigger(flashTimerRef, setFlash);
  const clearCountdown = useClearCountdown(countdownTimerRef, setCountdown);
  const notifyFinish = useNotifyFinish(playerId, accessKey, finishSentRef);

  useCountdownTick(remainingMs);

  const round = serverState.round;
  const players = serverState.players || [];
  const scoresByPlayer = round.scoresByPlayer || {};
  const myScore = playerId ? scoresByPlayer[playerId] || 0 : 0;
  const hasVoted = round.votesSubmittedIds?.includes(playerId) || false;
  const results = round.resultsByPlayer?.[playerId] || null;

  const playedWinRef = useRef(false);

  useEffect(() => {
    if (
      round.state === 'results' &&
      round.winnerIds.length > 0 &&
      round.winnerIds.includes(playerId) &&
      !playedWinRef.current
    ) {
      playWinSound();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      confetti({ particleCount: 100, spread: 80, origin: { x: 1, y: 0.6 } });
      playedWinRef.current = true;
    }
  }, [round.state, round.winnerIds, playerId]);

  useEffect(() => {
    playedWinRef.current = false;
  }, [round.id]);

  /** Final scores keyed by player id, derived from the authoritative results. */
  const finalScores = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(round.resultsByPlayer || {}).map(([id, result]) => [id, result.finalScore])
      ),
    [round.resultsByPlayer]
  );

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

  const acceptedByCategory = useMemo(() => {
    const map = new Map<string, string>();
    const myGroup = (round.wordsByPlayer || []).find((group) => group.playerId === playerId);
    if (!myGroup) return map;
    for (const entry of myGroup.words || []) {
      if (entry.category) map.set(entry.category, entry.word);
    }
    return map;
  }, [round.wordsByPlayer, playerId]);

  /**
   * Clear the input for a category.
   * @param category Category name.
   */
  function clearInput(category: string) {
    setWordInputs((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  }

  useEffect(() => {
    if (!playerId || round.state !== 'active' || !round.durationMs) {
      clearCountdown();
      setTimeUp(false);
      return;
    }
    if (roundId !== round.id) {
      setRoundId(round.id);
      setWordInputs({});
      setTimeUp(false);
      const endsAt = Date.now() + round.durationMs;
      clearCountdown();
      setCountdown(formatMs(round.durationMs));
      countdownTimerRef.current = setInterval(() => {
        const remaining = endsAt - Date.now();
        if (remaining <= 0) {
          setCountdown('00:00');
          setRemainingMs(0);
          clearCountdown();
          setTimeUp(true);
          notifyFinish(round.id);
          return;
        }
        setCountdown(formatMs(remaining));
        setRemainingMs(remaining);
      }, 250);
    }
  }, [round.id, round.state, round.durationMs, playerId, roundId, clearCountdown, notifyFinish, countdownTimerRef]);

  useEffect(() => {
    setStatus('');
    setSubmitStatus('');
    setFailedCategories(new Set());
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

  async function onPlayAgain() {
    setActionStatus('');
    const result = await handlePlayAgain(round.durationMs!, accessKey);
    setActionStatus(result.statusMessage);
    if (result.success) {
      setShowConfig(false);
    }
  }

  /**
   * Handle word submission for a given category.
   * @param category Category name.
   * @param e Form submit event.
   */
  async function onWordSubmit(category: string, e: React.FormEvent) {
    e.preventDefault();
    setStatus('');
    setSubmitStatus('');
    const hasUserInput = category in wordInputs;
    const acceptedWord = acceptedByCategory.get(category);
    const currentValue = hasUserInput ? wordInputs[category] : (acceptedWord ?? '');

    if (timeUp) {
      triggerFlash('error');
      setStatus('Time is up.');
      setSubmitStatus('error');
      clearInput(category);
      return;
    }

    if (!round.letter) {
      throw new Error('round.letter must exist during active round');
    }

    const result = await handleWordSubmission(currentValue, {
      playerId,
      accessKey,
      letter: round.letter,
      category,
    });

    triggerFlash(result.success ? 'success' : 'error');
    result.success ? playOkaySound() : playWarningSound();
    setStatus(result.success ? 'Word accepted.' : result.statusMessage);
    setSubmitStatus(result.success ? 'success' : 'error');
    if (result.success) {
      clearInput(category);
      setFailedCategories((prev) => { const next = new Set(prev); next.delete(category); return next; });
    } else {
      setFailedCategories((prev) => new Set(prev).add(category));
    }
  }

  function handleInputChange(category: string, value: string) {
    setWordInputs((prev) => ({ ...prev, [category]: value }));
    setFailedCategories((prev) => { const next = new Set(prev); next.delete(category); return next; });
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

    setVoteStatus(result.statusMessage);
  }



  const showView = round.letter && ['active', 'voting', 'results'].includes(round.state);
  if (!showView) {
    return (
      <Panel>
        <VolumeNotice />
      </Panel>
    );
  }

  const statusMessage = status || (timeUp ? 'Time is up.' : '');

  return (
    <div className={flash ? `flash-${flash}` : ''}>
      {round.state === 'active' && (
        <MulticatActivePanel
          letter={round.letter}
          countdown={countdown}
          statusMessage={statusMessage}
          connection={connection}
          myScore={myScore}
          isAdmin={isAdmin}
          isParticipating={isParticipating}
          categories={round.categories || []}
          timeUp={timeUp}
          acceptedByCategory={acceptedByCategory}
          wordInputs={wordInputs}
          submitStatus={submitStatus}
          failedCategories={failedCategories}
          onInputChange={handleInputChange}
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
          showCategory
          title="Downvote Words You Disagree With"
          description=""
          isParticipating={isParticipating}
        />
      )}

      {round.state === 'results' && (
        <>
          {Object.keys(round.resultsByPlayer || {}).length === 0 ? (
            <Panel title="Results">
              <p>No results — nobody submitted any words this round.</p>
            </Panel>
          ) : (
            <>
              <div className="game-result-winner">
                {buildWinnerMessage(round.winnerNames, playerName || null)}
              </div>
              <ScoreBoard
                title="Final Scores"
                players={players.filter((p) => round.participants.includes(p.id))}
                scores={finalScores}
                winnerIds={round.winnerIds}
              />
              {results && <PlayerResults words={results.words} showCategory />}
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
