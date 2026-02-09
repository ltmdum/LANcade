import { describe, it, expect } from 'vitest';
import { createCategoryManager } from '../stores/category-manager.js';

describe('category manager', () => {
  it('selects the first category by default', () => {
    const manager = createCategoryManager({ categories: ['A', 'B'] });
    expect(manager.getSelectedCategory()).toBe('A');
  });

  it('falls back to General when empty', () => {
    const manager = createCategoryManager({ categories: [] });
    expect(manager.getSelectedCategory()).toBe('General');
  });

  it('accepts valid categories', () => {
    const manager = createCategoryManager({ categories: ['A', 'B'] });
    const result = manager.selectCategory('B');
    expect(result.ok).toBe(true);
    expect(manager.getSelectedCategory()).toBe('B');
  });

  it('rejects unknown categories', () => {
    const manager = createCategoryManager({ categories: ['A', 'B'] });
    const result = manager.selectCategory('C');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unknown_category');
  });

  it('blocks changes when disallowed', () => {
    const manager = createCategoryManager({
      categories: ['A', 'B'],
      canChange: () => false,
    });
    const result = manager.selectCategory('B');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('round_active');
    const randomResult = manager.selectRandomCategory();
    expect(randomResult.ok).toBe(false);
    expect(randomResult.reason).toBe('round_active');
  });
});
