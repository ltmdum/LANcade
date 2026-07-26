import { PlayerStore } from '../shared/stores/player-store.js';
import type { SessionStore } from '../shared/stores/session-store.js';

/**
 * Options passed to a game factory when creating a new game instance.
 */
export interface GameFactoryOptions {
  clientGraceMs: number;
  onStateChange: () => void;
  playerStore: PlayerStore;
  sessionStore: SessionStore;
}

/**
 * Base interface that all game instances must implement.
 * Server.ts interacts with games only through this interface.
 */
export interface BaseGame {
  /** Get the current game state for broadcasting to clients */
  getState(): unknown;
  
  /** Get the current game phase (e.g., 'idle', 'active', 'voting', 'results', 'finished') */
  getPhase?: () => string;
  
  /** Handle a player joining the game */
  joinPlayer(payload: { name?: string; playerId?: string }): {
    ok: boolean;
    playerId?: string;
    name?: string;
    error?: string;
  };
  
  /** Submit a word during gameplay */
  submitWord(playerId: string, word: string, category?: string): {
    ok: boolean;
    reason?: string;
  };
  
  /** Signal that a player has finished their round (for timed games) */
  finishRound?: (playerId: string, roundId: number) => {
    ok: boolean;
    reason?: string;
  };
  
  /** Submit votes during the voting phase */
  submitVotes(playerId: string, votes: unknown): {
    ok: boolean;
    reason?: string;
  };
  
  /** Start a new round with the given duration */
  startRound(durationMs: number): {
    ok: boolean;
    roundId?: number;
    letter?: string;
  };
  
  /** Select a single category (for games that support it) */
  selectCategory?: (category: string) => {
    ok: boolean;
    category?: string;
    reason?: string;
  };
  
  /** Select a random category (for games that support it) */
  selectRandomCategory?: () => {
    ok: boolean;
    category?: string;
    reason?: string;
  };
  
  /** Select multiple categories (for games that support it) */
  selectCategories?: (categories: string[]) => {
    ok: boolean;
    categories?: string[];
    reason?: string;
  };
  
  /** Select random categories (for games that support it) */
  selectRandomCategories?: (count?: number) => {
    ok: boolean;
    categories?: string[];
    reason?: string;
  };

  /** Add a custom category to the game's category list */
  addCategory?: (category: string) => {
    ok: boolean;
    category?: string;
    reason?: string;
  };

  /** End the current game/round early (admin action) */
  endGame?: () => {
    ok: boolean;
    reason?: string;
  };

  /** Handle a generic game-specific action from a player */
  handleAction?: (playerId: string, action: unknown) => {
    ok: boolean;
    reason?: string;
  };

  /** Update game-specific settings from the admin panel */
  updateSettings?: (settings: Record<string, unknown>) => {
    ok: boolean;
    reason?: string;
  };

  /** Clean up timers and resources when the game instance is being replaced */
  dispose?: () => void;
}

/**
 * Metadata about a game plugin, used for display and registration.
 */
export interface GameDefinition {
  /** Unique identifier for the game (used in config and API) */
  id: string;
  /** Human-readable name for the game */
  name: string;
  /** Factory function to create a new game instance */
  factory: (options: GameFactoryOptions) => BaseGame;
}

/**
 * A game plugin exports this interface to register itself.
 */
export interface GamePlugin {
  /** The game definition including id, name, and factory */
  definition: GameDefinition;
}
