import { useState } from 'react';
import { Panel } from './Panel';
import { GameInfoModal } from './GameInfoModal';
import { selectGame } from '../utils/api';
import type { GameInfo } from '@lancade/shared';
import './GameSelector.css';

interface GameInfoData {
  name: string;
  description: string;
  instructions: string[];
}

interface GameSelectorProps {
  games: GameInfo[];
  selectedGameId: string;
  accessKey: string;
  onUnauthorized: () => void;
  getGameDescription?: (gameId: string) => string | undefined;
  getGameInfo?: (gameId: string) => GameInfoData | undefined;
}

/**
 * Admin game selector panel.
 * @param props Game selector props.
 * @returns Game selector element.
 */
export function GameSelector({
  games,
  selectedGameId,
  accessKey,
  onUnauthorized,
  getGameDescription,
  getGameInfo,
}: GameSelectorProps) {
  const [status, setStatus] = useState('');
  const [hoveredGameId, setHoveredGameId] = useState<string | null>(null);
  const [infoGameId, setInfoGameId] = useState<string | null>(null);

  /**
   * Select a game via the admin API.
   * @param gameId Game identifier.
   */
  async function handleSelectGame(gameId: string) {
    if (!accessKey) {
      setStatus('Admin access required.');
      return;
    }
    setStatus('');
    try {
      const { response } = await selectGame(gameId, accessKey);
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      if (response.status === 409) {
        setStatus('Finish the current round before switching games.');
        return;
      }
      if (!response.ok) {
        setStatus('Could not switch games.');
        return;
      }
      setStatus('Game selected.');
    } catch {
      setStatus('Could not switch games.');
    }
  }

  return (
    <Panel title="Game Selection">
      <div className="game-selector-list">
        {games.map((game) => {
          const description = getGameDescription?.(game.id);
          return (
            <div key={game.id} className="game-selector-row">
              <label className="game-selector-label">
                <input
                  type="radio"
                  name="game"
                  checked={game.id === selectedGameId}
                  onChange={() => handleSelectGame(game.id)}
                  disabled={!accessKey}
                  className="game-selector-radio"
                />
                <span className="game-selector-name">{game.name}</span>
              </label>
              {description && (
                <div className="game-selector-info-container">
                  <button
                    type="button"
                    className="game-selector-info-button"
                    onMouseEnter={() => setHoveredGameId(game.id)}
                    onMouseLeave={() => setHoveredGameId(null)}
                    onClick={() => setInfoGameId(game.id)}
                    aria-label={`Info about ${game.name}`}
                  >
                    i
                  </button>
                  {hoveredGameId === game.id && !infoGameId && (
                    <div className="game-selector-tooltip">
                      {description}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {status && <p className="game-selector-status">{status}</p>}
      {infoGameId && (() => {
        const info = getGameInfo?.(infoGameId);
        if (!info) return null;
        return (
          <GameInfoModal
            name={info.name}
            description={info.description}
            instructions={info.instructions}
            onClose={() => setInfoGameId(null)}
          />
        );
      })()}
    </Panel>
  );
}
