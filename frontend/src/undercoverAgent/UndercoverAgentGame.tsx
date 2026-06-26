import { useState, useEffect, useMemo } from 'react';
import { PlayAgainPanel } from '../shared/components/PlayAgainPanel';
import { RevealPanel } from './components/RevealPanel';
import { UndercoverSubmitPanel } from './components/UndercoverSubmitPanel';
import { UndercoverWordList } from './components/UndercoverWordList';
import { UndercoverVotePanel } from './components/UndercoverVotePanel';
import { UndercoverGuessPanel } from './components/UndercoverGuessPanel';
import { UndercoverResultDisplay } from './components/UndercoverResultDisplay';
import { handlePlayAgain } from '../shared/utils/roundActions';
import type { GameProps } from '../shared/types/GameProps';
import type { UndercoverAgentState } from '@lancade/shared';
import './UndercoverAgentGame.css';

interface UndercoverAgentGameProps extends GameProps {
  serverState: UndercoverAgentState;
}

/**
 * Main Undercover Agent game UI component.
 * Renders the appropriate sub-component based on the current match state.
 * @param props Game props from the plugin.
 * @returns Undercover Agent game element.
 */
export function UndercoverAgentGame({
  serverState,
  playerId,
  accessKey,
  isAdmin,
  isParticipating,
  setShowConfig,
}: UndercoverAgentGameProps) {
  const [myRole, setMyRole] = useState<string | null>(null);
  const [adminStatus, setAdminStatus] = useState('');

  const match = serverState.match;

  const playerLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    for (const player of serverState.players || []) {
      lookup[player.id] = player.name;
    }
    return lookup;
  }, [serverState.players]);

  // Reset role when a new match starts
  useEffect(() => {
    setMyRole(null);
  }, [match.id]);

  // Reset admin status when match state changes
  useEffect(() => {
    setAdminStatus('');
  }, [match.id, match.state]);

  /**
   * Handle starting a new game.
   */
  async function onRestart() {
    setAdminStatus('');
    const durationMs = match.totalRounds * 1000;
    const result = await handlePlayAgain(durationMs, accessKey);
    setAdminStatus(result.statusMessage);
    if (result.success) {
      setShowConfig(false);
    }
  }

  if (match.state === 'idle') {
    return null;
  }

  return (
    <div className="undercover-container">
      <MatchPhaseContent
        match={match}
        playerId={playerId}
        accessKey={accessKey}
        myRole={myRole}
        onReveal={setMyRole}
        playerLookup={playerLookup}
        isParticipating={isParticipating}
      />

      {isAdmin && match.state === 'finished' && (
        <PlayAgainPanel
          onPlayAgain={onRestart}
          onBackToConfig={() => setShowConfig(true)}
          status={adminStatus}
          playAgainText="New Game"
          title="Game Over"
        />
      )}
    </div>
  );
}

interface MatchPhaseContentProps {
  match: UndercoverAgentState['match'];
  playerId: string;
  accessKey: string;
  myRole: string | null;
  onReveal: (role: string) => void;
  playerLookup: Record<string, string>;
  isParticipating: boolean;
}

/**
 * Render the correct content panel based on the current match phase.
 * @param props Phase content props.
 * @returns Phase-specific element.
 */
function MatchPhaseContent({
  match,
  playerId,
  accessKey,
  myRole,
  onReveal,
  playerLookup,
  isParticipating,
}: MatchPhaseContentProps) {
  const hasRevealed = match.revealedPlayerIds.includes(playerId);
  const hasReadied = match.readyPlayerIds.includes(playerId);
  const currentTurnPlayerName = match.currentTurnPlayerId
    ? (playerLookup[match.currentTurnPlayerId] || 'Unknown')
    : 'Unknown';

  if (match.state === 'reveal') {
    if (!isParticipating) return null;
    return (
      <RevealPanel
        playerId={playerId}
        accessKey={accessKey}
        hasRevealed={hasRevealed}
        myRole={myRole}
        word={match.word}
        hasReadied={hasReadied}
        onReveal={onReveal}
      />
    );
  }

  if (match.state === 'submitting') {
    return (
      <>
        {isParticipating && (
          <UndercoverSubmitPanel
            playerId={playerId}
            accessKey={accessKey}
            isMyTurn={match.currentTurnPlayerId === playerId}
            currentTurnPlayerName={currentTurnPlayerName}
            currentRound={match.currentRound}
            totalRounds={match.totalRounds}
            hasSubmittedThisRound={match.roundSubmittedPlayerIds.includes(playerId)}
          />
        )}
        <UndercoverWordList submissions={match.submissions} />
      </>
    );
  }

  if (match.state === 'voting') {
    if (!isParticipating) {
      return <UndercoverWordList submissions={match.submissions} />;
    }
    return (
      <UndercoverVotePanel
        playerId={playerId}
        accessKey={accessKey}
        participants={match.participants}
        submissions={match.submissions}
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
        <UndercoverWordList submissions={match.submissions} />
      </>
    );
  }

  if (match.state === 'finished' && match.undercoverPlayerId) {
    return (
      <UndercoverResultDisplay
        undercoverPlayerId={match.undercoverPlayerId}
        undercoverPlayerName={playerLookup[match.undercoverPlayerId] || 'Unknown'}
        winnerIsUndercover={match.winnerIsUndercover}
        finishReason={match.finishReason}
        finalGuess={match.finalGuess}
        submissions={match.submissions}
        word={match.word}
      />
    );
  }

  return null;
}
