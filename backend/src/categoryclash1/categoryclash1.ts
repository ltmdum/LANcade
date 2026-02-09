import { categories } from '@lancade/shared';
import { createCategoryManager } from '../shared/stores/category-manager.js';
import { createCategoryClashEngine, CategoryClashEngine } from '../categoryclashshared/categoryclash-engine.js';
import { PlayerStore } from '../shared/stores/player-store.js';

export interface CategoryClash1GameOptions {
  onStateChange?: () => void;
  clientGraceMs?: number;
  playerStore?: PlayerStore;
}

export interface CategoryClash1Game extends CategoryClashEngine {
  id: string;
  name: string;
  categories: string[];
}

/**
 * Create a Category Clash v1 game instance.
 * @param options Optional configuration overrides.
 * @returns Category Clash v1 game instance.
 */
export function createGame(options: CategoryClash1GameOptions = {}): CategoryClash1Game {
  const engine = createCategoryClashEngine({
    categories,
    createCategoryManager: (config) => createCategoryManager(config),
    onStateChange: options.onStateChange,
    clientGraceMs: options.clientGraceMs,
    playerStore: options.playerStore,
    limitPerCategory: false,
  });

  return {
    id: 'categoryclash1',
    name: 'Category Clash v1.0',
    categories,
    ...engine,
  };
}
