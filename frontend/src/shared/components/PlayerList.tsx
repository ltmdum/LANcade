import { useState } from 'react';
import { Panel } from './Panel';
import { ejectPlayer } from '../utils/api';
import type { PlayerInfo } from '@lancade/shared';
import './PlayerList.css';

interface PlayerListProps {
  players: PlayerInfo[];
  accessKey?: string;
  onUnauthorized?: () => void;
}

/**
 * List players with optional admin eject controls.
 * @param props Player list props.
 * @returns Player list element.
 */
export function PlayerList({ players, accessKey, onUnauthorized }: PlayerListProps) {
  const [ejecting, setEjecting] = useState<string | null>(null);

  /**
   * Eject a player via the admin API.
   * @param playerId Player identifier.
   */
  async function handleEject(playerId: string) {
    if (!accessKey) return;
    setEjecting(playerId);
    try {
      const { response } = await ejectPlayer(playerId, accessKey);
      if (response.status === 401 && onUnauthorized) {
        onUnauthorized();
      }
    } catch {
      // Ignore errors
    } finally {
      setEjecting(null);
    }
  }

  return (
    <Panel title="Players">
      {players.length > 0 ? (
        <ul className="player-list">
          {players.map((player) => (
            <li key={player.id} className="player-list-item">
              <span>{player.name}</span>
              {accessKey && (
                <button
                  type="button"
                  className="player-list-eject"
                  onClick={() => handleEject(player.id)}
                  disabled={ejecting === player.id}
                >
                  {ejecting === player.id ? '...' : 'Eject'}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="player-list-empty">No players yet.</p>
      )}
    </Panel>
  );
}
