import type { CategorySettings } from '@lancade/shared';

export interface CategoryManagerOptions {
  categories?: string[];
  onChange?: () => void;
  canChange?: () => boolean;
}

export interface CategorySelectResult {
  ok: boolean;
  category?: string;
  reason?: string;
}

export interface CategoryManager {
  getSelectedCategory(): string;
  getSettings(): CategorySettings;
  selectCategory(category: string): CategorySelectResult;
  selectRandomCategory(): CategorySelectResult;
}

/**
 * Create a category manager for selecting and reporting categories.
 * @param options Configuration for categories and change guards.
 * @returns Category manager instance.
 */
export function createCategoryManager(options: CategoryManagerOptions): CategoryManager {
  const categories = options.categories || [];
  const onChange = options.onChange || (() => {});
  const canChange = options.canChange || (() => true);

  let selectedCategory = categories[0] || 'General';

  /**
   * Update the selected category and notify listeners.
   * @param next Category to set as selected.
   * @returns Result payload for the selection.
   */
  function setSelected(next: string): CategorySelectResult {
    selectedCategory = next;
    onChange();
    return { ok: true, category: selectedCategory };
  }

  /**
   * Select a specific category if it exists and changes are allowed.
   * @param category Category to select.
   * @returns Result payload for the selection.
   */
  function selectCategory(category: string): CategorySelectResult {
    if (!categories.includes(category)) {
      return { ok: false, reason: 'unknown_category' };
    }
    if (!canChange()) {
      return { ok: false, reason: 'round_active' };
    }
    return setSelected(category);
  }

  /**
   * Select a random category if changes are allowed.
   * @returns Result payload for the selection.
   */
  function selectRandomCategory(): CategorySelectResult {
    if (!canChange()) {
      return { ok: false, reason: 'round_active' };
    }
    const next = categories[Math.floor(Math.random() * categories.length)];
    return setSelected(next);
  }

  /**
   * Get the currently selected category.
   * @returns Selected category name.
   */
  function getSelectedCategory(): string {
    return selectedCategory;
  }

  /**
   * Build the shared category settings payload.
   * @returns Category settings for clients.
   */
  function getSettings(): CategorySettings {
    return {
      categories,
      selectedCategory,
    };
  }

  return {
    getSelectedCategory,
    getSettings,
    selectCategory,
    selectRandomCategory,
  };
}
