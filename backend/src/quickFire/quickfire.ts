import { categories } from '@lancade/shared';
import { createCategoryManager } from '../shared/stores/category-manager.js';
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

export interface QuickFireGameOptions {
  onStateChange?: () => void;
  clientGraceMs?: number;
  playerStore?: PlayerStore;
  sessionStore?: SessionStore;
}

export interface QuickFireGame extends CategoryClashEngine {
  id: string;
  name: string;
  categories: string[];
}

/**
 * Create a Quick Fire game instance.
 * @param options Optional configuration overrides.
 * @returns Quick Fire game instance.
 */
export function createGame(options: QuickFireGameOptions = {}): QuickFireGame {
  const sessionStore = options.sessionStore;

  const quickFireStrategy: WordSubmissionStrategy = {
    validateSubmission(
      _round: Round,
      playerId: string,
      key: string,
      _category: string,
      existingWord: WordEntry | undefined,
      _getPlayerName: (id: string) => string
    ): SubmitWordResult | null {
      if (existingWord && existingWord.playerId === playerId) {
        return { ok: false, reason: 'already_used_by_self', blockedWord: existingWord.word.toLowerCase() };
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
      _round: Round,
      _playerId: string,
      _category: string
    ): void {
      // Words accumulate; nothing to remove
    },
  };

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
    id: 'quickfire',
    name: 'Category Clash: Quick Fire',
    categories,
    ...engine,
  };
}
