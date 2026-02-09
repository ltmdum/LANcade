/**
 * Common props passed to all game components from plugins.
 */
export interface GameProps {
  /** Current connection status message */
  connection: string;
  /** Current player's ID */
  playerId: string;
  /** Current player's name */
  playerName: string;
  /** Player authentication password */
  playerPassword: string;
  /** Admin session ID for admin actions */
  adminSessionId: string;
  /** Whether the current user is an admin */
  isAdmin: boolean;
  /** Callback to show/hide the config panel */
  setShowConfig: (show: boolean) => void;
}
