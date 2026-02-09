import { describe, it, expect } from 'vitest';
import { createMultiCategoryManager } from '../stores/multi-category-manager.js';
import { withStubbedRandom } from '../../shared/tests/helpers.js';

describe('multi-category manager', () => {
  it('selects defaults and prevents empty selection', () => {
    const manager = createMultiCategoryManager({ categories: ['A', 'B', 'C'], defaultCount: 2 });
    expect(manager.getSelectedCategories()).toEqual(['A', 'B']);

    const empty = manager.selectCategories([]);
    expect(empty.ok).toBe(false);
    expect(empty.reason).toBe('empty');
  });

  it('respects canChange guard', () => {
    const manager = createMultiCategoryManager({
      categories: ['A', 'B'],
      canChange: () => false,
    });
    const result = manager.selectCategories(['B']);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('round_active');
  });

  it('selects random categories', async () => {
    await withStubbedRandom(0, () => {
      const manager = createMultiCategoryManager({ categories: ['A', 'B', 'C'] });
      const random = manager.selectRandomCategories(2);
      expect(random.ok).toBe(true);
      expect(random.categories!.length).toBe(2);
    });
  });
});
