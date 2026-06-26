import { canFormWordFromTiles } from '@lancade/shared';
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
import { generateGrid, type GenerateGridOptions } from './grid.js';

export interface GridlockGameOptions {
  onStateChange?: () => void;
  clientGraceMs?: number;
  playerStore?: PlayerStore;
  /** Grid generation overrides (for testing). */
  gridOptions?: GenerateGridOptions;
}

export interface GridlockGame extends CategoryClashEngine {
  id: string;
  name: string;
  categories: string[];
}

/**
 * Gridlock submission strategy.
 * Each distinct word may only be accepted once. Because the engine already
 * rejects words taken by other players, an existing word here always belongs
 * to the submitting player and is rejected as a duplicate.
 */
const gridlockStrategy: WordSubmissionStrategy = {
  validateSubmission(
    _round: Round,
    _playerId: string,
    _key: string,
    _category: string,
    existingWord: WordEntry | undefined,
    _getPlayerName: (id: string) => string
  ): SubmitWordResult | null {
    if (existingWord) {
      return { ok: false, reason: 'duplicate' };
    }
    return null;
  },

  prepareForNewWord(
    _round: Round,
    _playerId: string,
    _category: string
  ): void {
    // Words accumulate; nothing to remove.
  },
};

/**
 * Reject a word that cannot be spelled from the round's letter tiles.
 * @param round Active round carrying the available letter tiles.
 * @param key Uppercased candidate word.
 * @returns Rejection result when the word uses unavailable letters, else null.
 */
function validateGridWord(round: Round, key: string): SubmitWordResult | null {
  if (!canFormWordFromTiles(key, round.letters || [])) {
    return { ok: false, reason: 'invalid_letters' };
  }
  return null;
}

/**
 * Award points equal to the number of letters in the word.
 * @param word Accepted word entry.
 * @returns The word's letter count.
 */
function scoreByLength(word: WordEntry): number {
  return word.word.length;
}

/**
 * Create a Gridlock game instance.
 * @param options Optional configuration overrides.
 * @returns Gridlock game instance.
 */
export function createGame(options: GridlockGameOptions = {}): GridlockGame {
  const engine = createCategoryClashEngine(
    {
      categories: [],
      categoryless: true,
      createCategoryManager: (config) => createCategoryManager({ ...config, categories: [] }),
      generateRoundData: () => ({ letter: null, letters: generateGrid(options.gridOptions).letters }),
      validateActiveWord: (round, key) => validateGridWord(round, key),
      scoreWord: scoreByLength,
      onStateChange: options.onStateChange,
      clientGraceMs: options.clientGraceMs,
      playerStore: options.playerStore,
    },
    gridlockStrategy
  );

  return {
    id: 'gridlock',
    name: 'Gridlock',
    categories: [],
    ...engine,
  };
}
