import { categories } from '@lancade/shared';
import { createCategoryManager } from '../shared/stores/category-manager.js';
import {
  createCategoryClashEngine,
  CategoryClashEngine,
  type WordSubmissionStrategy,
  type Round,
  type WordEntry,
  type SubmitWordResult,
} from '../categoryclashshared/categoryclash-engine.js';
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
 * Quick Fire submission strategy.
 * Players can submit unlimited words per category with no replacement.
 */
const quickFireStrategy: WordSubmissionStrategy = {
  validateSubmission(
    _round: Round,
    playerId: string,
    _key: string,
    _category: string,
    existingWord: WordEntry | undefined,
    _getPlayerName: (id: string) => string
  ): SubmitWordResult | null {
    if (existingWord && existingWord.playerId === playerId) {
      return { ok: false, reason: 'already_used_by_self', blockedWord: existingWord.word.toLowerCase() };
    }
    return null;
  },

  prepareForNewWord(
    _round: Round,
    _playerId: string,
    _category: string
  ): void {
    // Words accumulate; nothing to remove
  },
};

/**
 * Create a Quick Fire game instance.
 * @param options Optional configuration overrides.
 * @returns Quick Fire game instance.
 */
export function createGame(options: QuickFireGameOptions = {}): QuickFireGame {
  const engine = createCategoryClashEngine(
    {
      categories,
      createCategoryManager: (config) => createCategoryManager(config),
      onStateChange: options.onStateChange,
      clientGraceMs: options.clientGraceMs,
      playerStore: options.playerStore,
    },
    quickFireStrategy
  );

  return {
    id: 'quickfire',
    name: 'Category Clash: Quick Fire',
    categories,
    ...engine,
  };
}
