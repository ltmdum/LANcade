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
 * BlankSlate game UI component.
 * @param props Game props from the plugin.
 * @returns BlankSlate game element.
 */
export function MindMatchGame({
  serverState,
  playerId,
  playerPassword,
  adminSessionId,
  isAdmin,
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
    // BlankSlate doesn't use duration (rounds end when all submit), but API requires a value
    const durationMs = round.durationMs ?? 60000;
    const result = await handlePlayAgain(durationMs, adminSessionId);
    setAdminStatus(result.statusMessage);
    if (result.success) {
      setShowConfig(false);
    }
  }

  if (round.state === 'idle' && !serverState.winnerId) {
    return null;
  }

  if (isAdmin && !serverState.players?.some(p => p.id === playerId)) {
    if (round.state === 'results' || serverState.winnerId) {
      return (
        <PlayAgainPanel
          onPlayAgain={onRestart}
          onBackToConfig={() => setShowConfig(true)}
          status={adminStatus}
          playAgainText={serverState.winnerId ? 'New Game' : 'Next Round'}
          title={serverState.winnerId ? 'Game Over' : 'Next Steps'}
        />
      );
    }
    return null;
  }

  return (
    <div className="blankslate-container">
      {serverState.winnerId && (
        <WinnerDisplay
          winnerName={serverState.winnerName || 'Unknown'}
          scores={scores}
          playerLookup={playerLookup}
        />
      )}

      {!serverState.winnerId && round.prompt && (
        <PromptDisplay prompt={round.prompt} />
      )}

      {round.state === 'submitting' && (
        <SubmitPanel
          playerId={playerId}
          playerPassword={playerPassword}
          hasSubmitted={hasSubmitted}
          playerSubmission={playerSubmission}
        />
      )}

      {round.state === 'claiming' && (
        <ClaimPanel
          playerId={playerId}
          playerPassword={playerPassword}
          canMakeClaim={canMakeClaim}
          claimableTargets={claimableTargets}
          submissions={round.submissions || []}
          playerSubmission={playerSubmission}
          roundId={round.id}
        />
      )}

      {round.state === 'voting' && (
        <VotePanel
          playerId={playerId}
          playerPassword={playerPassword}
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

      {!serverState.winnerId && (
        <ScoreBoard
          scores={scores}
          playerLookup={playerLookup}
          winnerId={null}
        />
      )}

      {isAdmin && (round.state === 'results' || serverState.winnerId) && (
        <PlayAgainPanel
          onPlayAgain={onRestart}
          onBackToConfig={() => setShowConfig(true)}
          status={adminStatus}
          playAgainText={serverState.winnerId ? 'New Game' : 'Next Round'}
          title={serverState.winnerId ? 'Game Over' : 'Next Steps'}
        />
      )}
    </div>
  );
}
