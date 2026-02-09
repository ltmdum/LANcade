import type { PlayerGameState } from '@lancade/shared';
import './GameResult.css';

interface GameResultProps {
  winnerId: string | null;
  winnerName: string | null;
  targetWord: string | null;
  currentPlayerId: string;
  playerStates: PlayerGameState[];
}

/**
 * Display the game result when finished.
 * @param props Result props.
 * @returns Result element.
 */
export function GameResult({ winnerId, winnerName, targetWord, currentPlayerId, playerStates }: GameResultProps) {
  const isWinner = winnerId === currentPlayerId;
  const hasWinner = winnerId !== null;

  return (
    <div className="game-result">
      {hasWinner ? (
        <div className={`game-result-message ${isWinner ? 'game-result-win' : 'game-result-lose'}`}>
          {isWinner ? (
            <>
              <span className="game-result-emoji">🎉</span>
              <span>You won!</span>
            </>
          ) : (
            <>
              <span className="game-result-emoji">👏</span>
              <span>{winnerName} won!</span>
            </>
          )}
        </div>
      ) : (
        <div className="game-result-message game-result-lose">
          <span className="game-result-emoji">😔</span>
          <span>No one guessed the word</span>
        </div>
      )}
      
      {targetWord && (
        <div className="game-result-word">
          The word was: <strong>{targetWord}</strong>
        </div>
      )}

      <PlayerSummary playerStates={playerStates} winnerId={winnerId} />
    </div>
  );
}

interface PlayerSummaryProps {
  playerStates: PlayerGameState[];
  winnerId: string | null;
}

/**
 * Summary of all players' performance.
 * @param props Player summary props.
 * @returns Player summary element.
 */
function PlayerSummary({ playerStates, winnerId }: PlayerSummaryProps) {
  if (playerStates.length <= 1) return null;

  // Sort by: solved first, then by fewer guesses
  const sortedStates = [...playerStates].sort((a, b) => {
    if (a.playerId === winnerId) return -1;
    if (b.playerId === winnerId) return 1;
    if (a.solved && !b.solved) return -1;
    if (!a.solved && b.solved) return 1;
    return a.grid.length - b.grid.length;
  });

  return (
    <div className="game-result-summary">
      <h4 className="game-result-summary-title">Results</h4>
      <div className="game-result-players">
        {sortedStates.map((state, index) => (
          <div 
            key={state.playerId} 
            className={`game-result-player ${state.playerId === winnerId ? 'game-result-player-winner' : ''}`}
          >
            <span className="game-result-player-rank">{index + 1}.</span>
            <span className="game-result-player-name">{state.playerName}</span>
            <span className="game-result-player-status">
              {state.solved ? (
                <span className="game-result-solved">{state.grid.length} guesses</span>
              ) : (
                <span className="game-result-failed">Not solved</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
