import type { PlayerGameState, PlayerFinishInfo, PlayerGridRow, LetterStatus } from '@lancade/shared';
import './GameResult.css';

interface GameResultProps {
  winnerId: string | null;
  winnerName: string | null;
  targetWord: string | null;
  currentPlayerId: string;
  playerStates: PlayerGameState[];
  finishOrder: PlayerFinishInfo[];
}

/* ---------- cell helpers ---------- */

function getCellClass(status: LetterStatus): string {
  switch (status) {
    case 'correct': return 'guess-cell-correct';
    case 'present': return 'guess-cell-present';
    default: return 'guess-cell-absent';
  }
}

function GridRowPreview({ row }: { row: PlayerGridRow }) {
  return (
    <div className="gr-grid-row">
      {row.letters.map((status, i) => (
        <span key={i} className={`gr-cell ${getCellClass(status)}`}>{row.word[i]}</span>
      ))}
    </div>
  );
}

/* ---------- main component ---------- */

/**
 * Display the game result when finished.
 * @param props Result props.
 * @returns Result element.
 */
export function GameResult({
  winnerId, winnerName, targetWord, currentPlayerId,
  playerStates, finishOrder,
}: GameResultProps) {
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

      <div className="game-result-summary">
        <h4 className="game-result-summary-title">Leaderboard</h4>
        <div className="game-result-players">
          {finishOrder.length > 0 ? finishOrder.map((entry, index) => {
            const pstate = playerStates.find(s => s.playerId === entry.playerId);
            return (
              <div
                key={entry.playerId}
                className={`game-result-player ${
                  entry.playerId === winnerId ? 'game-result-player-winner' : ''
                } ${entry.playerId === currentPlayerId ? 'game-result-player-me' : ''}`}
              >
                <div className="game-result-player-header">
                  <span className="game-result-player-rank">{index + 1}.</span>
                  <span className="game-result-player-name">{entry.playerName}</span>
                  <span className="game-result-player-status">
                    {entry.solved ? (
                      <span className="game-result-solved">Solved in {entry.solvedAtRow} guesses</span>
                    ) : (
                      <span className="game-result-failed">Not solved</span>
                    )}
                  </span>
                </div>
                {pstate && pstate.grid.length > 0 && (
                  <div className="gr-player-grid">
                    {pstate.grid.map((row, ri) => (
                      <GridRowPreview key={ri} row={row} />
                    ))}
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="game-result-player">
              <span className="game-result-player-name">No results</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
