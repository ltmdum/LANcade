import { categories } from '@lancade/shared';
import { createMultiCategoryManager } from '../categoryclashshared/stores/multi-category-manager.js';
import { createCategoryClashEngine, CategoryClashEngine } from '../categoryclashshared/categoryclash-engine.js';
import { PlayerStore } from '../shared/stores/player-store.js';

export interface MulticatGameOptions {
  onStateChange?: () => void;
  clientGraceMs?: number;
  playerStore?: PlayerStore;
}

export interface MulticatGame extends CategoryClashEngine {
  id: string;
  name: string;
  categories: string[];
}

/**
 * Create a Category Clash v2 game instance.
 * @param options Optional configuration overrides.
 * @returns Category Clash v2 game instance.
 */
export function createGame(options: MulticatGameOptions = {}): MulticatGame {
  const engine = createCategoryClashEngine({
    categories,
    createCategoryManager: (config) => createMultiCategoryManager({
      ...config,
      defaultCount: 3,
    }),
    onStateChange: options.onStateChange,
    clientGraceMs: options.clientGraceMs,
    playerStore: options.playerStore,
    limitPerCategory: true,
  });

  return {
    id: 'multicat',
    name: 'Category Clash: Multicat',
    categories,
    ...engine,
  };
}
