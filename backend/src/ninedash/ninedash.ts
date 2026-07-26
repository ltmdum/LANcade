import { canFormWordFromTiles } from '@lancade/shared';
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
import { generateGrid, type GenerateGridOptions } from './grid.js';
import { loadNineLetterWords } from './word-source.js';

/** Options for creating a Nine Dash game instance. */
export interface NineDashGameOptions {
  onStateChange?: () => void;
  clientGraceMs?: number;
  playerStore?: PlayerStore;
  sessionStore?: SessionStore;
  gridOptions?: GenerateGridOptions;
}

/** A Nine Dash game instance built on the category-clash engine. */
export interface NineDashGame extends CategoryClashEngine {
  id: string;
  name: string;
  categories: string[];
}

const wordStrategy: WordSubmissionStrategy = {
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
    // Words accumulate; nothing to remove.
  },
};

function validateGridWord(round: Round, key: string): SubmitWordResult | null {
  if (!canFormWordFromTiles(key, round.letters || [])) {
    return { ok: false, reason: 'invalid_letters' };
  }
  return null;
}

/**
 * Create a Nine Dash game instance.
 * @param options Grid generation and engine options.
 * @returns A Nine Dash game conforming to the category-clash engine interface.
 */
export function createGame(options: NineDashGameOptions = {}): NineDashGame {
  const sessionStore = options.sessionStore;
  let currentSourceWord: string | null = null;
  const usedSourceWords = new Set<string>();

  // Load persisted used source words from session store
  (function initUsedWords(): void {
    if (!sessionStore) return;
    const stored = sessionStore.get<string[]>('ninedash:used-words');
    if (stored) {
      for (const w of stored) {
        usedSourceWords.add(w);
      }
    }
  })();

  function scoreByLength(word: WordEntry): number {
    const base = word.word.length;
    if (currentSourceWord && word.word === currentSourceWord) {
      return base * 2;
    }
    return base;
  }

  const engine = createCategoryClashEngine(
    {
      categories: [],
      categoryless: true,
      createCategoryManager: (config) => createCategoryManager({ ...config, categories: [] }),
      generateRoundData: () => {
        if (options.gridOptions?.word) {
          const grid = generateGrid(options.gridOptions);
          currentSourceWord = grid.word;
          return { letter: null, letters: grid.letters };
        }
        const allWords = loadNineLetterWords();
        const available = allWords.filter((w) => !usedSourceWords.has(w));
        const pool = available.length > 0 ? available : allWords;
        if (pool === allWords && usedSourceWords.size > 0) {
          usedSourceWords.clear();
        }
        const word = pool[Math.floor(Math.random() * pool.length)];
        usedSourceWords.add(word);
        if (sessionStore) {
          sessionStore.set('ninedash:used-words', Array.from(usedSourceWords));
        }
        const grid = generateGrid({ word });
        currentSourceWord = grid.word;
        return { letter: null, letters: grid.letters };
      },
      validateActiveWord: (round, key) => validateGridWord(round, key),
      scoreWord: scoreByLength,
      onStateChange: options.onStateChange,
      clientGraceMs: options.clientGraceMs,
      playerStore: options.playerStore,
    },
    wordStrategy
  );

  const originalGetState = engine.getState.bind(engine);
  engine.getState = () => {
    const state = originalGetState();
    return {
      ...state,
      round: { ...state.round, sourceWord: currentSourceWord },
    };
  };

  return {
    id: 'ninedash',
    name: 'Nine Dash',
    categories: [],
    ...engine,
  };
}
