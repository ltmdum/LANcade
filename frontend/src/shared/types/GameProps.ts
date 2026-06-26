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
  /** Access key parsed from the invite URL (player or admin). */
  accessKey: string;
  /** Whether the current user is an admin */
  isAdmin: boolean;
  /** Whether the current user is actively playing the round. */
  isParticipating: boolean;
  /** Callback to show/hide the config panel */
  setShowConfig: (show: boolean) => void;
}
