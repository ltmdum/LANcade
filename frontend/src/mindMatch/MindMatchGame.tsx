import { useState, useEffect, useMemo } from 'react';
import { PlayAgainPanel } from '../shared/components/PlayAgainPanel';
import { PromptDisplay } from './components/PromptDisplay';
import { SubmitPanel } from './components/SubmitPanel';
import { ClaimPanel } from './components/ClaimPanel';
import { VotePanel } from './components/VotePanel';
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

  const playerLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    for (const player of serverState.players || []) {
      lookup[player.id] = player.name;
    }
    return lookup;
  }, [serverState.players]);

  const hasSubmitted = round.submittedPlayerIds?.includes(playerId) || false;
  const playerSubmission = round.submissions?.find((s) => s.playerId === playerId);

  // Check if current player can make a claim (has claimable targets from server)
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
    // Mind Match doesn't use duration (rounds end when all submit), but API requires a value
    const durationMs = round.durationMs ?? 60000;
    const result = await handlePlayAgain(durationMs, accessKey);
    setAdminStatus(result.statusMessage);
    if (result.success) {
      setShowConfig(false);
    }
  }

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

      {!serverState.winnerIds.length && round.prompt && (
        <PromptDisplay prompt={round.prompt} />
      )}

      {round.state === 'submitting' && isParticipating && (
        <SubmitPanel
          playerId={playerId}
          accessKey={accessKey}
          hasSubmitted={hasSubmitted}
          playerSubmission={playerSubmission}
        />
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
          playerLookup={playerLookup}
        />
      )}

      {round.state === 'results' && round.result && (
        <ResultsPanel
          result={round.result}
          playerLookup={playerLookup}
        />
      )}

      {!serverState.winnerIds.length && (
        <ScoreBoard
          scores={scores}
          playerLookup={playerLookup}
          winnerId={null}
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
