import type { SessionStore } from '../shared/stores/session-store.js';
import wordListData from '../shared/data/common-words.json' with { type: 'json' };

const wordList = wordListData as string[];

/**
 * Select a random word from the word list, avoiding previously used words.
 * When the pool is exhausted the used list is cleared (reset) before picking.
 * @param usedWords Set of words already used this game (session).
 * @returns A randomly selected word.
 */
export function selectRandomWord(usedWords: Set<string>): string {
  const available = wordList.filter(w => !usedWords.has(w));
  const pool = available.length > 0 ? available : wordList;
  if (pool === wordList && usedWords.size > 0) {
    usedWords.clear();
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Load the persisted used-words set from the session store.
 * @param sessionStore Session store (optional).
 * @param storageKey Storage key namespaced to the game.
 * @returns Set of previously used words.
 */
export function loadUsedWords(
  sessionStore: SessionStore | undefined,
  storageKey: string
): Set<string> {
  const usedWords = new Set<string>();
  if (!sessionStore) return usedWords;
  const stored = sessionStore.get<string[]>(storageKey);
  if (stored) {
    for (const w of stored) {
      usedWords.add(w);
    }
  }
  return usedWords;
}

/**
 * Persist the used-words set to the session store.
 * @param sessionStore Session store (optional).
 * @param storageKey Storage key namespaced to the game.
 * @param usedWords Set of used words to persist.
 */
export function saveUsedWords(
  sessionStore: SessionStore | undefined,
  storageKey: string,
  usedWords: Set<string>
): void {
  if (!sessionStore) return;
  sessionStore.set(storageKey, Array.from(usedWords));
}
