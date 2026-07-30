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

  it('adds a custom category', () => {
    const manager = createMultiCategoryManager({ categories: ['A', 'B', 'C'] });
    const result = manager.addCategory('Custom');
    expect(result.ok).toBe(true);
    expect(result.category).toBe('Custom');
    expect(manager.getSettings().categories).toContain('Custom');
  });

  it('rejects duplicate custom category', () => {
    const manager = createMultiCategoryManager({ categories: ['A', 'B'] });
    manager.addCategory('New');
    const duplicate = manager.addCategory('New');
    expect(duplicate.ok).toBe(false);
    expect(duplicate.reason).toBe('duplicate');
  });

  it('rejects custom category when round is active', () => {
    const manager = createMultiCategoryManager({
      categories: ['A', 'B'],
      canChange: () => false,
    });
    const result = manager.addCategory('Custom');
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
