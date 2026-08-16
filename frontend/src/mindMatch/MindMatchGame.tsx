import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PlayAgainPanel } from '../shared/components/PlayAgainPanel';
import { ScoreBoard } from '../shared/components/ScoreBoard';
import { PromptDisplay } from './components/PromptDisplay';
import { SubmitPanel } from './components/SubmitPanel';
import { ClaimPanel } from './components/ClaimPanel';
import { VotePanel } from './components/VotePanel';
import { VoteResultsPanel } from './components/VoteResultsPanel';
import { ResultsPanel } from './components/ResultsPanel';
import confetti from 'canvas-confetti';
import { playWinSound } from '../shared/utils/sounds';
import { buildWinnerMessage } from '../shared/utils/winnerMessage';
import { handlePlayAgain } from '../shared/utils/roundActions';
import type { GameProps } from '../shared/types/GameProps';
import type { MindMatchState } from '@lancade/shared';
import './MindMatchGame.css';

interface MindMatchGameProps extends GameProps {
  serverState: MindMatchState;
}

/**
 * Mind Match game UI component.
 * @param props Game props from the plugin.
 * @returns Mind Match game element.
 */
export function MindMatchGame({
  serverState,
  playerId,
  playerName,
  accessKey,
  isAdmin,
  isParticipating,
  setShowConfig,
}: MindMatchGameProps) {
  const [adminStatus, setAdminStatus] = useState('');

  const round = serverState.round;
  const scores = serverState.scores || {};
  const winningScore = (serverState.gameSettings?.winningScore as number) ?? 25;

  const playerLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    for (const player of serverState.players || []) {
      lookup[player.id] = player.name;
    }
    return lookup;
  }, [serverState.players]);

  const hasSubmitted = round.submittedPlayerIds?.includes(playerId) || false;
  const playerSubmission = round.submissions?.find((s) => s.playerId === playerId);

  const claimableTargets = useMemo(() => {
    if (round.state !== 'claiming') return [];
    return round.claimableTargets?.[playerId] || [];
  }, [round.state, round.claimableTargets, playerId]);

  const canMakeClaim = claimableTargets.length > 0;

  const prevWinnerIdsRef = useRef<string[]>(serverState.winnerIds);

  useEffect(() => {
    if (
      serverState.winnerIds.length > 0 &&
      serverState.winnerIds.includes(playerId) &&
      !prevWinnerIdsRef.current.includes(playerId)
    ) {
      playWinSound();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      confetti({ particleCount: 100, spread: 80, origin: { x: 1, y: 0.6 } });
    }
    prevWinnerIdsRef.current = serverState.winnerIds;
  }, [serverState.winnerIds, playerId]);

  // Reset admin status when round changes
  useEffect(() => {
    setAdminStatus('');
  }, [round.id, round.state]);

  async function onRestart() {
    setAdminStatus('');
    const durationMs = round.durationMs ?? 60000;
    const result = await handlePlayAgain(durationMs, accessKey);
    setAdminStatus(result.statusMessage);
    if (result.success) {
      setShowConfig(false);
    }
  }

  const onShowResults = useCallback(async () => {
    setAdminStatus('');
    try {
      const res = await fetch('/api/round/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, roundId: round.id, key: accessKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminStatus(data.reason || 'Could not advance.');
      }
    } catch {
      setAdminStatus('Could not advance.');
    }
  }, [playerId, round.id, accessKey]);

  if (round.state === 'idle' && serverState.winnerIds.length === 0) {
    return null;
  }

  return (
    <div className="blankslate-container">
      {serverState.winnerIds.length > 0 && (
        <div className="game-result-winner">
          {buildWinnerMessage(serverState.winnerNames, playerName || null)}
        </div>
      )}

      {round.state === 'submitting' && isParticipating ? (
        <SubmitPanel
          playerId={playerId}
          accessKey={accessKey}
          hasSubmitted={hasSubmitted}
          playerSubmission={playerSubmission}
          prompt={round.prompt!}
          players={serverState.players}
          submittedPlayerIds={round.submittedPlayerIds}
        />
      ) : (
        !serverState.winnerIds.length &&
          round.prompt &&
          round.state !== 'results' &&
          round.state !== 'voting_results' && (
          <PromptDisplay prompt={round.prompt} />
        )
      )}

      {round.state === 'claiming' && isParticipating && (
        <ClaimPanel
          playerId={playerId}
          accessKey={accessKey}
          canMakeClaim={canMakeClaim}
          claimableTargets={claimableTargets}
          submissions={round.submissions || []}
          playerSubmission={playerSubmission}
          roundId={round.id}
        />
      )}

      {round.state === 'voting' && isParticipating && (
        <VotePanel
          playerId={playerId}
          accessKey={accessKey}
          claims={round.claims || []}
          currentClaimIndex={round.currentClaimIndex}
        />
      )}

      {round.state === 'voting_results' && (
        <VoteResultsPanel
          claims={round.claims || []}
          playerLookup={playerLookup}
          onShowResults={onShowResults}
          isAdmin={isAdmin}
          adminStatus={adminStatus}
        />
      )}

      {round.state === 'results' && round.result && (
        <ResultsPanel result={round.result} />
      )}

      <ScoreBoard
        title={serverState.winnerIds.length > 0 ? 'Final Scores' : 'Live Scores'}
        players={serverState.players}
        scores={scores}
        targetScore={winningScore}
        winnerIds={serverState.winnerIds.length > 0 ? serverState.winnerIds : undefined}
        roundPoints={round.result?.scoreChanges}
      />

      {isAdmin && round.state === 'results' && serverState.winnerIds.length === 0 && (
        <div className="play-again-actions" style={{ justifyContent: 'center', marginTop: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={onRestart}>
            Next Round
          </button>
          {adminStatus && <p className="play-again-status">{adminStatus}</p>}
        </div>
      )}

      {isAdmin && serverState.winnerIds.length > 0 && (
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
