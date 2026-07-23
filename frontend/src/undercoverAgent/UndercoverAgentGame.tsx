import { useState, useEffect, useMemo } from 'react';
import { PlayAgainPanel } from '../shared/components/PlayAgainPanel';
import { RevealPanel } from './components/RevealPanel';
import { UndercoverSubmitPanel } from './components/UndercoverSubmitPanel';
import { UndercoverWordList } from './components/UndercoverWordList';
import { UndercoverVotePanel } from './components/UndercoverVotePanel';
import { UndercoverGuessPanel } from './components/UndercoverGuessPanel';
import { UndercoverResultDisplay } from './components/UndercoverResultDisplay';
import { DiscussionPanel } from './components/DiscussionPanel';
import { UndercoverScoreBoard } from './components/UndercoverScoreBoard';
import { handlePlayAgain } from '../shared/utils/roundActions';
import type { GameProps } from '../shared/types/GameProps';
import type { UndercoverAgentState } from '@lancade/shared';
import './UndercoverAgentGame.css';

interface UndercoverAgentGameProps extends GameProps {
  serverState: UndercoverAgentState;
}

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
    setMyRole(null);
  }, [match.id]);

  useEffect(() => {
    setAdminStatus('');
    setServerScores(null);
  }, [match.id, match.state]);

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
      {roundOver && (
        <>
          {isGameOver && (
            <div className="undercover-result-winner undercover-result-winner--civilians">
              {match.winnerIds.length === 1
                ? `${match.winnerNames[0]} wins the game!`
                : `${match.winnerNames.join(' and ')} tie for the win!`}
            </div>
          )}
          <UndercoverScoreBoard
            scores={showScores}
            roundPoints={match.roundPoints}
            winningScore={match.winningScore}
            playerLookup={playerLookup}
            winnerIds={match.winnerIds}
          />
          <UndercoverResultDisplay
            undercoverPlayerId={match.undercoverPlayerId || ''}
            undercoverPlayerName={playerLookup[match.undercoverPlayerId || ''] || 'Unknown'}
            finishReason={match.finishReason}
            finalGuess={match.finalGuess}
            submissions={match.submissions}
            word={match.word}
          />
        </>
      )}

      <MatchPhaseContent
        match={match}
        playerId={playerId}
        accessKey={accessKey}
        myRole={myRole}
        onReveal={setMyRole}
        playerLookup={playerLookup}
        isParticipating={isParticipating}
      />

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
            hasSubmittedThisRound={match.roundSubmittedPlayerIds.includes(playerId)}
          />
        )}
        <UndercoverWordList submissions={match.submissions} />
      </>
    );
  }

  if (match.state === 'discussion') {
    return (
      <>
        {isParticipating && (
          <DiscussionPanel
            playerId={playerId}
            accessKey={accessKey}
            isReady={match.discussionReadyPlayerIds.includes(playerId)}
            readyCount={match.discussionReadyPlayerIds.length}
            totalCount={match.participants.length}
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

  return null;
}
