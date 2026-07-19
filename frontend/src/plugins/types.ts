import type { ReactNode } from 'react';

/**
 * Props passed to every game component.
 */
export interface GameComponentProps {
  /** Current server state (cast to game-specific type in component) */
  serverState: unknown;
  /** Connection status message */
  connection: string;
  /** Current player's ID */
  playerId: string;
  /** Current player's name */
  playerName: string;
  /** Access key parsed from the invite URL (player or admin). */
  accessKey: string;
  /** Whether the current user is an admin */
  isAdmin: boolean;
  /** Whether the current user is actively playing the round (false for non-playing admin). */
  isParticipating: boolean;
  /** Callback to show/hide config panel */
  setShowConfig: (show: boolean) => void;
}

/**
 * Configuration for a game plugin.
 */
export interface GamePluginConfig {
  /** Unique identifier for the game (must match backend) */
  id: string;
  /** Human-readable name for display */
  name: string;
  /** Short slogan or tagline for the game */
  slogan: string;
  /** Longer description explaining how the game works (shown in hover tooltips) */
  description: string;
  /** Step-by-step instructions for how to play (shown in info modal). Each entry has a bold heading and the explanation text. */
  instructions: { heading: string; text: string }[];
  /** Default timer settings for admin panel (optional if hideTimer is true) */
  defaultTimer?: {
    minutes: string;
    seconds: string;
  };
  /** Label for the round control panel */
  roundControlTitle: string;
  /** Label for the join panel */
  joinPanelTitle: string;
  /** Minimum number of players required to start (defaults to 1) */
  minPlayers?: number;
  /** Whether to hide the timer config in admin panel (defaults to false) */
  hideTimer?: boolean;
  /** Custom duration selector replacing the minutes/seconds dropdowns */
  customDuration?: {
    label: string;
    options: { label: string; durationMs: number }[];
  };
  /** Declarative game-specific admin settings (rendered as a settings panel) */
  gameSettings?: GameSettingControl[];
}

/** An option within a select-type game setting. */
export interface GameSettingOption {
  label: string;
  value: number;
}

/** A control rendered in the admin game settings panel. */
export type GameSettingControl =
  | {
      /** Key used in the settings payload and server state. */
      key: string;
      /** Human-readable label. */
      label: string;
      /** Control type. */
      type: 'select';
      /** Available options. */
      options: GameSettingOption[];
      /** Default value. */
      defaultValue: number;
    }
  | {
      /** Key used in the settings payload and server state. */
      key: string;
      /** Human-readable label. */
      label: string;
      /** Control type. */
      type: 'duration';
      /** Default minutes value (defaults to '00'). */
      defaultMinutes?: string;
      /** Default seconds value (defaults to '30'). */
      defaultSeconds?: string;
      /** Multiplier to convert total seconds to the stored value. Defaults to 1 (seconds). Use 1000 for milliseconds. */
      valueMultiplier?: number;
    };

/**
 * A frontend game plugin that provides configuration and a render function.
 */
export interface GamePlugin {
  /** Game configuration */
  config: GamePluginConfig;
  
  /**
   * Check if this plugin can render for the given server state.
   * Used to match the correct game plugin to the current game state.
   */
  canRender: (serverState: unknown, gameId: string) => boolean;
  
  /**
   * Get the current game phase from the server state.
   * Returns 'idle', 'active', 'voting', 'results', 'finished', etc.
   */
  getPhase: (serverState: unknown) => string;
  
  /**
   * Get the header category text to display during active play.
   * For single-category games, returns the category name.
   * For multi-category games, may return formatted list of categories.
   */
  getHeaderCategory: (serverState: unknown) => string;
  
  /**
   * Render the game component.
   */
  render: (props: GameComponentProps) => ReactNode;
}
