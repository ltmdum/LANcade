import { useState, useEffect, useMemo, useRef } from 'react';
import { Panel } from '../shared/components/Panel';
import { PlayAgainPanel } from '../shared/components/PlayAgainPanel';
import { RevealPanel } from '../undercovershared/components/RevealPanel';
import { DoubleBluffSubmitPanel } from './components/DoubleBluffSubmitPanel';
import { UndercoverWordList } from '../undercovershared/components/UndercoverWordList';
import { UndercoverVotePanel } from '../undercovershared/components/UndercoverVotePanel';
import { UndercoverGuessPanel } from '../undercovershared/components/UndercoverGuessPanel';
import { DoubleBluffResultDisplay } from './components/DoubleBluffResultDisplay';
import { ScoreBoard } from '../shared/components/ScoreBoard';
import { handlePlayAgain } from '../shared/utils/roundActions';
import { VolumeNotice } from '../shared/components/VolumeNotice';
import confetti from 'canvas-confetti';
import { playOkaySound, playWarningSound, playWinSound, warmupAudio } from '../shared/utils/sounds';
import { buildWinnerMessage } from '../shared/utils/winnerMessage';
import type { GameProps } from '../shared/types/GameProps';
import type { DoubleBluffState, DoubleBluffSubmission, UndercoverSubmission } from '@lancade/shared';
import './doublebluff.css';

interface DoubleBluffGameProps extends GameProps {
  serverState: DoubleBluffState;
}

/**
 * Adapt Double Bluff submissions to the shared undercover submission shape
 * used by the shared word list and vote panel. Only the displayed clue is
 * exposed while the round is in progress.
 * @param subs Double Bluff submissions.
 * @returns Submissions in the shared shape.
 */
function toUndercoverSubmissions(subs: DoubleBluffSubmission[]): UndercoverSubmission[] {
  return subs.map(({ playerId, playerName, clues, displayedClue }) => ({
    playerId,
    playerName,
    words: [displayedClue ?? clues[0]].filter((w): w is string => Boolean(w)),
  }));
}

export function DoubleBluffGame({
  serverState,
  playerId,
  playerName,
  accessKey,
  isAdmin,
  isParticipating,
  setShowConfig,
}: DoubleBluffGameProps) {
  const [adminStatus, setAdminStatus] = useState('');
  const [serverScores, setServerScores] = useState<Record<string, number> | null>(null);

  const match = serverState.match;

  const playerLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    for (const player of serverState.players || []) {
      lookup[player.id] = player.name;
    }
    return lookup;
  }, [serverState.players]);

  useEffect(() => {
    setAdminStatus('');
    setServerScores(null);
  }, [match.id, match.state]);

  useEffect(() => {
    warmupAudio();
  }, []);

  const prevWaveRef = useRef<string | null>(null);

  useEffect(() => {
    if (match.state !== 'submitting') {
      prevWaveRef.current = null;
      return;
    }
    const waveKey = `${match.id}:${match.cluePhase}`;
    if (prevWaveRef.current !== waveKey) {
      prevWaveRef.current = waveKey;
      if (isParticipating && !match.submittedPlayerIds.includes(playerId)) {
        playOkaySound();
      }
    }
  }, [match.state, match.cluePhase, match.id, match.submittedPlayerIds, playerId, isParticipating]);

  const prevMatchStateRef = useRef(match.state);
  useEffect(() => {
    if (
      match.state === 'finished' &&
      prevMatchStateRef.current !== 'finished' &&
      match.winnerIds.length > 0 &&
      match.winnerIds.includes(playerId)
    ) {
      playWinSound();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      confetti({ particleCount: 100, spread: 80, origin: { x: 1, y: 0.6 } });
    }
    prevMatchStateRef.current = match.state;
  }, [match.state, match.winnerIds, playerId]);

  const prevStateRef = useRef<DoubleBluffState['match']['state'] | null>(null);
  useEffect(() => {
    if (
      prevStateRef.current !== 'guessing' &&
      match.state === 'guessing' &&
      match.undercoverPlayerId === playerId
    ) {
      playWarningSound();
    }
    prevStateRef.current = match.state;
  }, [match.state, match.undercoverPlayerId, playerId]);

  async function onRestart() {
    setAdminStatus('');
    const durationMs = 1000;
    const result = await handlePlayAgain(durationMs, accessKey);
    setAdminStatus(result.statusMessage);
    if (result.success) {
      setShowConfig(false);
    }
  }

  async function onNextWord() {
    setAdminStatus('');
    const result = await handlePlayAgain(1000, accessKey);
    setAdminStatus(result.statusMessage);
  }

  const showScores = serverScores || match.scores;

  const roundOver = match.finishReason !== null && (match.state === 'idle' || match.state === 'finished');
  const isGameOver = match.state === 'finished' && match.winnerIds.length > 0;

  return (
    <div className="undercover-container">
      <MatchPhaseContent
        match={match}
        playerId={playerId}
        accessKey={accessKey}
        playerLookup={playerLookup}
        isParticipating={isParticipating}
      />

      {isGameOver && (
        <div className="undercover-result-winner undercover-result-winner--civilians">
          {buildWinnerMessage(match.winnerNames, playerName || null)}
        </div>
      )}

      {(match.state !== 'idle' || roundOver) && (
        <ScoreBoard
          title={isGameOver ? 'Final Scores' : 'Live Scores'}
          players={serverState.players}
          scores={showScores}
          targetScore={match.winningScore}
          winnerIds={roundOver ? match.winnerIds : undefined}
          roundPoints={roundOver ? match.roundPoints : undefined}
        />
      )}

      {roundOver && (
        <DoubleBluffResultDisplay
          undercoverPlayerId={match.undercoverPlayerId || ''}
          undercoverPlayerName={playerLookup[match.undercoverPlayerId || ''] || 'Unknown'}
          finishReason={match.finishReason}
          finalGuess={match.finalGuess}
          submissions={match.submissions}
          voteRounds={match.voteRounds}
          playerLookup={playerLookup}
          word={match.word}
        />
      )}

      {!roundOver && match.state === 'idle' && <Panel><VolumeNotice /></Panel>}

      {isAdmin && match.state === 'idle' && match.winnerIds.length === 0 && (
        <div className="undercover-admin-controls">
          <button type="button" className="btn btn-primary" onClick={onNextWord}>
            Next Word
          </button>
          {adminStatus && <p className="undercover-turn-info">{adminStatus}</p>}
        </div>
      )}

      {isAdmin && isGameOver && (
        <PlayAgainPanel
          onPlayAgain={onRestart}
          onBackToConfig={() => setShowConfig(true)}
          status={adminStatus}
          title="Game Over"
        />
      )}
    </div>
  );
}

interface MatchPhaseContentProps {
  match: DoubleBluffState['match'];
  playerId: string;
  accessKey: string;
  playerLookup: Record<string, string>;
  isParticipating: boolean;
}

function MatchPhaseContent({
  match,
  playerId,
  accessKey,
  playerLookup,
  isParticipating,
}: MatchPhaseContentProps) {
  const isUndercover = match.undercoverPlayerId === playerId;
  const hasRevealed = match.revealedPlayerIds.includes(playerId);
  const hasReadied = match.readyPlayerIds.includes(playerId);

  if (match.state === 'reveal') {
    if (!isParticipating) return null;
    return (
      <RevealPanel
        playerId={playerId}
        accessKey={accessKey}
        hasRevealed={hasRevealed}
        isUndercover={isUndercover}
        word={match.word}
        hasReadied={hasReadied}
      />
    );
  }

  if (match.state === 'submitting') {
    if (!isParticipating) {
      return (
        <Panel title="Clue Submission">
          <p className="undercover-turn-info">
            Players are submitting their clues ({match.submittedPlayerIds.length}/
            {match.participants.length})...
          </p>
        </Panel>
      );
    }
    return (
      <DoubleBluffSubmitPanel
        playerId={playerId}
        accessKey={accessKey}
        cluePhase={match.cluePhase === 2 ? 2 : 1}
        isUndercover={isUndercover}
        hasSubmitted={match.submittedPlayerIds.includes(playerId)}
        submittedCount={match.submittedPlayerIds.length}
        totalCount={match.participants.length}
        firstClues={isUndercover && match.cluePhase === 2 ? match.firstClues : []}
      />
    );
  }

  if (match.state === 'voting') {
    if (!isParticipating) {
      return <UndercoverWordList submissions={toUndercoverSubmissions(match.submissions)} />;
    }
    return (
      <UndercoverVotePanel
        playerId={playerId}
        accessKey={accessKey}
        participants={match.participants}
        submissions={toUndercoverSubmissions(match.submissions)}
        voteRounds={match.voteRounds}
        currentVoteRound={match.currentVoteRound}
        hasVoted={match.votedPlayerIds.includes(playerId)}
        playerLookup={playerLookup}
      />
    );
  }

  if (match.state === 'guessing' && match.undercoverPlayerId) {
    return (
      <>
        {isParticipating && (
          <UndercoverGuessPanel
            playerId={playerId}
            accessKey={accessKey}
            isUndercover={playerId === match.undercoverPlayerId}
            undercoverPlayerName={playerLookup[match.undercoverPlayerId] || 'Unknown'}
          />
        )}
        <UndercoverWordList submissions={toUndercoverSubmissions(match.submissions)} />
      </>
    );
  }

  return null;
}
