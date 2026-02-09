import type { CategorySettings } from '@lancade/shared';

export interface MultiCategoryManagerOptions {
  categories?: string[];
  onChange?: () => void;
  canChange?: () => boolean;
  defaultCount?: number;
}

export interface MultiCategorySelectResult {
  ok: boolean;
  categories?: string[];
  reason?: string;
}

export interface MultiCategoryManager {
  getSelectedCategories(): string[];
  getSelectedCategory(): string;
  getSettings(): CategorySettings;
  selectCategories(categories: string[]): MultiCategorySelectResult;
  selectRandomCategories(count?: number): MultiCategorySelectResult;
}

/**
 * Shuffle a list using Fisher-Yates.
 * @param array Input array.
 * @returns New shuffled array.
 */
function shuffle<T>(array: T[]): T[] {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Normalize selected categories to unique, valid entries.
 * @param input Incoming list of categories.
 * @param available Allowed category list.
 * @returns Filtered list of unique categories.
 */
function normalizeCategories(input: unknown, available: string[]): string[] {
  const list = Array.isArray(input) ? input : [];
  const seen = new Set<string>();
  const output: string[] = [];
  for (const entry of list) {
    if (!available.includes(entry)) {
      continue;
    }
    if (seen.has(entry)) {
      continue;
    }
    seen.add(entry);
    output.push(entry);
  }
  return output;
}

/**
 * Create a multi-category manager that can select multiple categories.
 * @param options Configuration for categories and change guards.
 * @returns Multi-category manager instance.
 */
export function createMultiCategoryManager(options: MultiCategoryManagerOptions): MultiCategoryManager {
  const categories = options.categories || [];
  const onChange = options.onChange || (() => {});
  const canChange = options.canChange || (() => true);
  const defaultCount = Number.isFinite(options.defaultCount) ? options.defaultCount! : 3;

  let selectedCategories = normalizeCategories(
    categories.slice(0, Math.min(defaultCount, categories.length)),
    categories
  );

  /**
   * Update selection and notify listeners.
   * @param next Categories to set.
   * @returns Result payload for the selection.
   */
  function setSelected(next: string[]): MultiCategorySelectResult {
    selectedCategories = next;
    onChange();
    return { ok: true, categories: selectedCategories.slice() };
  }

  /**
   * Select specific categories if changes are allowed.
   * @param next Categories to select.
   * @returns Result payload for the selection.
   */
  function selectCategories(next: string[]): MultiCategorySelectResult {
    if (!canChange()) {
      return { ok: false, reason: 'round_active' };
    }
    const normalized = normalizeCategories(next, categories);
    if (normalized.length === 0) {
      return { ok: false, reason: 'empty' };
    }
    return setSelected(normalized);
  }

  /**
   * Select a random set of categories.
   * @param count Optional number of categories to select.
   * @returns Result payload for the selection.
   */
  function selectRandomCategories(count?: number): MultiCategorySelectResult {
    if (!canChange()) {
      return { ok: false, reason: 'round_active' };
    }
    if (categories.length === 0) {
      return { ok: false, reason: 'empty' };
    }
    const target = Number.isFinite(count) && count! > 0
      ? count!
      : selectedCategories.length || defaultCount || 1;
    const next = shuffle(categories).slice(0, Math.min(target, categories.length));
    return setSelected(next);
  }

  /**
   * Get the selected categories.
   * @returns Current selection.
   */
  function getSelectedCategories(): string[] {
    return selectedCategories.slice();
  }

  /**
   * Get the first selected category.
   * @returns First selected category or empty string.
   */
  function getSelectedCategory(): string {
    return selectedCategories[0] || '';
  }

  /**
   * Build the shared category settings payload.
   * @returns Category settings for clients.
   */
  function getSettings(): CategorySettings {
    return {
      categories,
      selectedCategories: selectedCategories.slice(),
      selectedCategory: selectedCategories[0] || '',
      categoryMode: 'multi',
    };
  }

  return {
    getSelectedCategories,
    getSelectedCategory,
    getSettings,
    selectCategories,
    selectRandomCategories,
  };
}
