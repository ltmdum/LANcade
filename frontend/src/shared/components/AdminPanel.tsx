import { Panel } from './Panel';
import { ejectPlayer } from '../utils/api';
import './AdminPanel.css';

interface AdminPanelProps {
  /** Admin access key from the URL. */
  accessKey: string;
  /** Whether the admin has opted to play this game. */
  isPlaying: boolean;
  /** Toggle the admin participation flag. */
  setIsPlaying: (next: boolean) => void;
  /** Current player ID, if the admin has joined. */
  playerId: string;
  /** Clear the local player identity (e.g. after self-eject). */
  clearPlayerIdentity: () => void;
}

/**
 * Admin participation toggle. The admin is authenticated via the access key
 * in the URL, so this panel only chooses whether the admin participates as
 * a player or spectates.
 * @param props Admin panel props.
 * @returns Admin panel element.
 */
export function AdminPanel({
  accessKey,
  isPlaying,
  setIsPlaying,
  playerId,
  clearPlayerIdentity,
}: AdminPanelProps) {
  /**
   * Toggle handler. When switching off and a player record exists, eject the
   * admin from the player list so they no longer appear as a participant.
   */
  async function handleToggle(next: boolean) {
    if (!next && playerId && accessKey) {
      try {
        await ejectPlayer(playerId, accessKey);
      } catch {
        // Local state still gets cleared below.
      }
      clearPlayerIdentity();
    }
    setIsPlaying(next);
  }

  return (
    <Panel title="Admin-only/Player">
      <label className="admin-panel-toggle-row">
        <span className="admin-panel-toggle-label">
          Play
        </span>
        <span className="admin-panel-toggle">
          <input
            type="checkbox"
            checked={isPlaying}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          <span className="admin-panel-toggle-track">
            <span className="admin-panel-toggle-thumb" />
          </span>
        </span>
      </label>
      <p className="admin-panel-status">
        {isPlaying
          ? 'You will join as a player. Enter your name below.'
          : 'You will spectate. Toggle on to play the next game.'}
      </p>
    </Panel>
  );
}
