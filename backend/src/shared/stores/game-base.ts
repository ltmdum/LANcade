import type { PlayerInfo, CategorySettings } from '@lancade/shared';
import { createPlayerStore, PlayerStore } from './player-store.js';
import { createCategoryManager, CategoryManager } from './category-manager.js';

export interface GameBaseOptions {
  playerStore?: PlayerStore;
  categoryManager?: CategoryManager;
  categories?: string[];
  onChange?: () => void;
  canChange?: () => boolean;
}

export interface BaseState {
  serverTime: number;
  players: PlayerInfo[];
  settings: CategorySettings;
}

export interface GameBase {
  playerStore: PlayerStore;
  categoryManager: CategoryManager;
  buildBaseState(): BaseState;
}

/**
 * Create shared game state helpers and stores.
 * @param options Dependencies and configuration overrides.
 * @returns Base game helpers.
 */
export function createGameBase(options: GameBaseOptions): GameBase {
  const playerStore = options.playerStore || createPlayerStore();
  const categoryManager = options.categoryManager || createCategoryManager({
    categories: options.categories,
    onChange: options.onChange,
    canChange: options.canChange,
  });

  /**
   * Build the shared state payload for clients.
   * @returns Base state snapshot.
   */
  function buildBaseState(): BaseState {
    return {
      serverTime: Date.now(),
      players: playerStore.listPlayers(),
      settings: categoryManager.getSettings(),
    };
  }

  return {
    playerStore,
    categoryManager,
    buildBaseState,
  };
}
