import { categories } from '@lancade/shared';
import { createMultiCategoryManager } from '../categoryclashshared/stores/multi-category-manager.js';
import {
  createCategoryClashEngine,
  CategoryClashEngine,
  type WordSubmissionStrategy,
  type Round,
  type WordEntry,
  type SubmitWordResult,
} from '../categoryclashshared/categoryclash-engine.js';
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
 * Multicat submission strategy.
 * One word per category. Re-submitting to a category replaces the previous
 * word. Players cannot reuse the same word across different categories.
 */
const multicatStrategy: WordSubmissionStrategy = {
  validateSubmission(
    _round: Round,
    playerId: string,
    _key: string,
    category: string,
    existingWord: WordEntry | undefined,
    _getPlayerName: (id: string) => string
  ): SubmitWordResult | null {
    if (existingWord && existingWord.playerId === playerId
        && existingWord.category.toLowerCase() !== category.toLowerCase()) {
      return {
        ok: false,
        reason: 'already_used_by_self',
        blockedWord: existingWord.word.toLowerCase(),
        blockedCategory: existingWord.category,
      };
    }
    return null;
  },

  prepareForNewWord(
    round: Round,
    playerId: string,
    category: string
  ): void {
    const categoryKey = category.toLowerCase();
    const existingIndex = round.acceptedWords.findIndex(
      (w) => w.playerId === playerId && w.category.toLowerCase() === categoryKey
    );
    if (existingIndex !== -1) {
      const existing = round.acceptedWords[existingIndex];
      round.acceptedWords.splice(existingIndex, 1);
      round.acceptedWordByKey.delete(existing.key);
      round.acceptedWordById.delete(existing.id);
    }
  },
};

/**
 * Create a Multicat game instance.
 * @param options Optional configuration overrides.
 * @returns Multicat game instance.
 */
export function createGame(options: MulticatGameOptions = {}): MulticatGame {
  const engine = createCategoryClashEngine(
    {
      categories,
      createCategoryManager: (config) => createMultiCategoryManager({
        ...config,
        defaultCount: 3,
      }),
      onStateChange: options.onStateChange,
      clientGraceMs: options.clientGraceMs,
      playerStore: options.playerStore,
    },
    multicatStrategy
  );

  return {
    id: 'multicat',
    name: 'Category Clash: Multicat',
    categories,
    ...engine,
  };
}
