import { useState, useEffect, useMemo, useCallback } from 'react';
import { PlayAgainPanel } from '../shared/components/PlayAgainPanel';
import { PromptDisplay } from './components/PromptDisplay';
import { SubmitPanel } from './components/SubmitPanel';
import { ClaimPanel } from './components/ClaimPanel';
import { VotePanel } from './components/VotePanel';
import { VoteResultsPanel } from './components/VoteResultsPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { ScoreBoard } from './components/ScoreBoard';
import { WinnerDisplay } from './components/WinnerDisplay';
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
        <WinnerDisplay
          winnerNames={serverState.winnerNames}
          scores={scores}
          playerLookup={playerLookup}
        />
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

      {!serverState.winnerIds.length && (
        <ScoreBoard
          scores={scores}
          playerLookup={playerLookup}
          winnerId={null}
          winningScore={winningScore}
        />
      )}

      {isAdmin && (round.state === 'results' || serverState.winnerIds.length > 0) && (
        <PlayAgainPanel
          onPlayAgain={onRestart}
          onBackToConfig={() => setShowConfig(true)}
          status={adminStatus}
          playAgainText={serverState.winnerIds.length > 0 ? 'New Game' : 'Next Round'}
          title={serverState.winnerIds.length > 0 ? 'Game Over' : 'Next Steps'}
        />
      )}
    </div>
  );
}
