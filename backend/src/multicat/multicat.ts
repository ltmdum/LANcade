import { categories } from '@lancade/shared';
import { createMultiCategoryManager } from '../categoryclashshared/stores/multi-category-manager.js';
import type { SessionStore } from '../shared/stores/session-store.js';
import {
  createCategoryClashEngine,
  CategoryClashEngine,
  type WordSubmissionStrategy,
  type Round,
  type WordEntry,
  type SubmitWordResult,
} from '../categoryclashshared/categoryclash-engine.js';
import { PlayerStore } from '../shared/stores/player-store.js';

const SHARED_KEY = 'shared:used-words';

export interface MulticatGameOptions {
  onStateChange?: () => void;
  clientGraceMs?: number;
  playerStore?: PlayerStore;
  sessionStore?: SessionStore;
}

export interface MulticatGame extends CategoryClashEngine {
  id: string;
  name: string;
  categories: string[];
}

/**
 * Create a Multicat game instance.
 * @param options Optional configuration overrides.
 * @returns Multicat game instance.
 */
export function createGame(options: MulticatGameOptions = {}): MulticatGame {
  const sessionStore = options.sessionStore;

  const multicatStrategy: WordSubmissionStrategy = {
    validateSubmission(
      _round: Round,
      playerId: string,
      key: string,
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
      const reuseEnabled = sessionStore?.get<boolean>('shared:reuse-enabled');
      if (reuseEnabled !== false) {
        const shared = sessionStore?.get<Set<string>>(SHARED_KEY);
        if (shared?.has(key.toLowerCase())) {
          return { ok: false, reason: 'used_in_previous_game', blockedWord: key.toLowerCase() };
        }
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

  // Wrap submitWord to persist accepted words to shared list
  const originalSubmitWord = engine.submitWord.bind(engine);
  engine.submitWord = (playerId: string, word: string, category?: string) => {
    const result = originalSubmitWord(playerId, word, category);
    if (result.ok && sessionStore) {
      const shared = sessionStore.get<Set<string>>(SHARED_KEY) || new Set();
      shared.add(word.trim().toLowerCase());
      sessionStore.set(SHARED_KEY, shared);
    }
    return result;
  };

  return {
    id: 'multicat',
    name: 'Category Clash: Multicat',
    categories,
    ...engine,
  };
}
