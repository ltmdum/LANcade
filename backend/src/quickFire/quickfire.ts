import { categories } from '@lancade/shared';
import { createCategoryManager } from '../shared/stores/category-manager.js';
import { createCategoryClashEngine, CategoryClashEngine } from '../categoryclashshared/categoryclash-engine.js';
import { PlayerStore } from '../shared/stores/player-store.js';

export interface QuickFireGameOptions {
  onStateChange?: () => void;
  clientGraceMs?: number;
  playerStore?: PlayerStore;
}

export interface QuickFireGame extends CategoryClashEngine {
  id: string;
  name: string;
  categories: string[];
}

/**
 * Create a Category Clash v1 game instance.
 * @param options Optional configuration overrides.
 * @returns Category Clash v1 game instance.
 */
export function createGame(options: QuickFireGameOptions = {}): QuickFireGame {
  const engine = createCategoryClashEngine({
    categories,
    createCategoryManager: (config) => createCategoryManager(config),
    onStateChange: options.onStateChange,
    clientGraceMs: options.clientGraceMs,
    playerStore: options.playerStore,
    limitPerCategory: false,
  });

  return {
    id: 'quickfire',
    name: 'Category Clash: Quick Fire',
    categories,
    ...engine,
  };
}
