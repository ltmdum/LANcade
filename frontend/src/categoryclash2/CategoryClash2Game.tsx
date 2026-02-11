import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PlayAgainPanel } from '../shared/components/PlayAgainPanel';
import { Panel } from '../shared/components/Panel';
import { Leaderboard } from '../categoryclashshared/components/Leaderboard';
import { PlayerResultsTable } from '../categoryclashshared/components/PlayerResultsTable';
import { VotingPanel } from '../categoryclashshared/components/VotingPanel';
import { CategoryClash2ActivePanel } from './components/CategoryClash2ActivePanel';
import { toggleVoteSelection } from '../categoryclashshared/utils/voting';
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
import './CategoryClash2Game.css';

interface CategoryClash2GameProps extends GameProps {
  serverState: CategoryClashState;
}

/**
 * Category Clash v2 gameplay surface.
 * @param props Game props from the plugin.
 * @returns Category Clash v2 game element.
 */
export function CategoryClash2Game({
  serverState,
  connection,
  playerId,
  playerPassword,
  adminSessionId,
  isAdmin,
  setShowConfig,
}: CategoryClash2GameProps) {
  const [wordInputs, setWordInputs] = useState<Record<string, string>>({});
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
  const notifyFinish = useNotifyFinish(playerId, playerPassword, finishSentRef);

  const round = serverState.round;
  const scoresByPlayer = round.scoresByPlayer || {};
  const myScore = playerId ? scoresByPlayer[playerId] || 0 : 0;
  const hasVoted = round.votesSubmittedIds?.includes(playerId) || false;
  const results = round.resultsByPlayer?.[playerId] || null;

  const scoreboard = useMemo(() => {
    if (!round.resultsByPlayer) return [];
    const entries = Object.entries(round.resultsByPlayer).map(([id, data]) => ({
      playerId: id,
      ...data,
    }));
    entries.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      if (a.votedOut !== b.votedOut) return a.votedOut - b.votedOut;
      if (a.rejected !== b.rejected) return b.rejected - a.rejected;
      return a.name.localeCompare(b.name);
    });
    return entries;
  }, [round.resultsByPlayer]);

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
    const result = await handlePlayAgain(round.durationMs!, adminSessionId);
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
    const hasUserInput = category in wordInputs;
    const acceptedWord = acceptedByCategory.get(category);
    const currentValue = hasUserInput ? wordInputs[category] : (acceptedWord ?? '');

    if (timeUp) {
      triggerFlash('error');
      setStatus('Time is up.');
      clearInput(category);
      return;
    }

    // Letter must exist during active round
    if (!round.letter) {
      throw new Error('round.letter must exist during active round');
    }

    const result = await handleWordSubmission(currentValue, {
      playerId,
      playerPassword,
      letter: round.letter,
      category,
    });

    triggerFlash(result.success ? 'success' : 'error');
    setStatus(result.success ? 'Word accepted.' : result.statusMessage);
    if (result.success) {
      clearInput(category);
    }
  }

  function onToggleVote(wordId: string) {
    setVoteSet((prev) => toggleVoteSelection(prev, wordId));
  }

  async function onVoteSubmit() {
    setVoteStatus('');
    const result = await handleVoteSubmit({
      playerId,
      playerPassword,
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

  /**
   * Update the local input for a category.
   * @param category Category name.
   * @param value Input value.
   */
  function handleInputChange(category: string, value: string) {
    setWordInputs((prev) => ({ ...prev, [category]: value }));
  }

  const showView = round.letter && ['active', 'voting', 'results'].includes(round.state);
  if (!showView) return null;

  if (isAdmin && !serverState.players?.some(p => p.id === playerId)) {
    if (round.state === 'results') {
      return (
        <PlayAgainPanel
          onPlayAgain={onPlayAgain}
          onBackToConfig={() => setShowConfig(true)}
          status={actionStatus}
        />
      );
    }
    return null;
  }

  const statusMessage = status || (timeUp ? 'Time is up.' : '');

  return (
    <div className={flash ? `flash-${flash}` : ''}>
      {round.state === 'active' && (
        <CategoryClash2ActivePanel
          letter={round.letter}
          countdown={countdown}
          statusMessage={statusMessage}
          connection={connection}
          myScore={myScore}
          isAdmin={isAdmin}
          categories={round.categories || []}
          timeUp={timeUp}
          acceptedByCategory={acceptedByCategory}
          wordInputs={wordInputs}
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
        />
      )}

      {round.state === 'results' && (
        <>
          {scoreboard.length === 0 ? (
            <Panel title="Results">
              <p>No results — nobody submitted any words this round.</p>
            </Panel>
          ) : (
            <>
              <Leaderboard entries={scoreboard} currentPlayerId={playerId} />
              {results && (
                <PlayerResultsTable
                  words={results.words}
                  showCategory
                  categories={round.categories}
                />
              )}
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
