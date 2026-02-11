import { useState, useEffect, useMemo } from 'react';
import { PlayerGuess } from './components/PlayerGuess';
import { GameResult } from './components/GameResult';
import { PlayAgainPanel } from '../shared/components/PlayAgainPanel';
import { submitWord } from '../shared/utils/api';
import type { GameProps } from '../shared/types/GameProps';
import type { WordSprintState } from '@lancade/shared';
import './WordSprintGame.css';

interface WordSprintGameProps extends GameProps {
  serverState: WordSprintState;
}

/**
 * Word Sprint gameplay surface.
 * @param props Game props from the plugin.
 * @returns Word Sprint game element.
 */
export function WordSprintGame({
  serverState,
  playerId,
  playerPassword,
  adminSessionId,
  isAdmin,
  setShowConfig,
}: WordSprintGameProps) {
  const [wordInput, setWordInput] = useState('');
  const [status, setStatus] = useState('');
  const [adminStatus, setAdminStatus] = useState('');

  const match = serverState.match;

  // Find current player's state
  const myState = useMemo(() => {
    return match.playerStates.find(s => s.playerId === playerId);
  }, [match.playerStates, playerId]);

  // Clear input on new match
  useEffect(() => {
    setWordInput('');
    setStatus('');
  }, [match.id]);

  async function handleSubmit() {
    if (wordInput.length !== 5) {
      setStatus('Enter a 5-letter word');
      return;
    }

    setStatus('');
    try {
      const { response, data } = await submitWord(playerId, wordInput, playerPassword);
      
      if (!response.ok) {
        const reason = data?.reason || 'unknown';
        const messages: Record<string, string> = {
          round_not_active: 'Game is not active',
          invalid_length: 'Word must be 5 letters',
          invalid_word: 'Not a valid word',
          already_solved: 'You already solved it!',
          out_of_guesses: 'No more guesses left',
        };
        setStatus(messages[reason] || 'Could not submit word');
        return;
      }

      setWordInput('');
      setStatus('');
    } catch {
      setStatus('Could not submit word');
    }
  }

  async function handlePlayAgain() {
    setAdminStatus('');
    try {
      const response = await fetch('/api/admin/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSessionId}`,
        },
        body: JSON.stringify({ durationMs: 1000 }),
      });
      
      if (!response.ok) {
        setAdminStatus('Could not restart');
        return;
      }
      
      setShowConfig(false);
    } catch {
      setAdminStatus('Could not restart');
    }
  }

  if (match.state === 'idle') return null;

  if (isAdmin && !serverState.players?.some(p => p.id === playerId)) {
    if (match.state === 'finished') {
      return (
        <PlayAgainPanel
          onPlayAgain={handlePlayAgain}
          onBackToConfig={() => setShowConfig(true)}
          status={adminStatus}
          playAgainText="Play Again"
          title="Next Steps"
        />
      );
    }
    return null;
  }

  // Determine if input should be enabled
  const isInputEnabled = match.state === 'active' && myState && !myState.solved && myState.grid.length < 6;

  return (
    <div className="wordsprint-game">
      {match.state === 'active' && (
        <PlayerGuess
          playerState={myState}
          rowBests={match.rowBests}
          wordInput={wordInput}
          onWordInputChange={setWordInput}
          onSubmit={handleSubmit}
          isInputEnabled={!!isInputEnabled}
          status={status}
        />
      )}

      {match.state === 'finished' && (
        <>
          <GameResult
            winnerId={match.winnerId}
            winnerName={match.winnerName}
            targetWord={match.targetWord}
            currentPlayerId={playerId}
            playerStates={match.playerStates}
          />

          {isAdmin && (
            <PlayAgainPanel
              onPlayAgain={handlePlayAgain}
              onBackToConfig={() => setShowConfig(true)}
              status={adminStatus}
              playAgainText="Play Again"
              title="Next Steps"
            />
          )}
        </>
      )}
    </div>
  );
}
