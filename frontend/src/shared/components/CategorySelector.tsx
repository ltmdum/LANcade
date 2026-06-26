import { useState } from 'react';
import { Panel } from './Panel';
import { selectCategory, selectRandomCategory, selectCategories, addCustomCategory } from '../utils/api';
import './CategorySelector.css';

interface CategorySelectorProps {
  categories: string[];
  selectedCategory: string;
  selectedCategories?: string[];
  categoryMode?: 'single' | 'multi';
  accessKey: string;
  onUnauthorized: () => void;
}

/**
 * Admin category selector for single or multi-category modes.
 * @param props Category selector props.
 * @returns Category selector element.
 */
export function CategorySelector({
  categories,
  selectedCategory,
  selectedCategories = [],
  categoryMode = 'single',
  accessKey,
  onUnauthorized,
}: CategorySelectorProps) {
  const [status, setStatus] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  /**
   * Select a specific category via the admin API.
   * @param category Category name.
   */
  async function handleSelectCategory(category: string) {
    if (!accessKey) {
      setStatus('Admin access required.');
      return;
    }
    setStatus('');
    try {
      const { response, data } = await selectCategory(category, accessKey);
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      if (!response.ok) {
        if (data.reason === 'round_active') {
          setStatus('Wait until the round is over to change category.');
          return;
        }
        setStatus('Could not set category.');
        return;
      }
      setStatus('Category selected.');
    } catch {
      setStatus('Could not set category.');
    }
  }

  async function handleRandomCategory() {
    if (!accessKey) {
      setStatus('Admin access required.');
      return;
    }
    setStatus('');
    try {
      const count = categoryMode === 'multi' ? (selectedCategories.length || 3) : undefined;
      const { response, data } = await selectRandomCategory(accessKey, count);
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      if (!response.ok) {
        if (data.reason === 'round_active') {
          setStatus('Wait until the round is over to change category.');
          return;
        }
        setStatus('Could not set category.');
        return;
      }
      setStatus('Random category selected.');
    } catch {
      setStatus('Could not set category.');
    }
  }

  /**
   * Toggle a category selection in multi-category mode.
   * @param category Category name.
   */
  async function handleToggleCategory(category: string) {
    if (!accessKey) {
      setStatus('Admin access required.');
      return;
    }
    const next = new Set(selectedCategories);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    setStatus('');
    try {
      const { response, data } = await selectCategories(Array.from(next), accessKey);
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      if (!response.ok) {
        if (data.reason === 'round_active') {
          setStatus('Wait until the round is over to change categories.');
          return;
        }
        if (data.reason === 'empty') {
          setStatus('Select at least one category.');
          return;
        }
        setStatus('Could not set categories.');
        return;
      }
      setStatus('Categories updated.');
    } catch {
      setStatus('Could not set categories.');
    }
  }

  /**
   * Add a custom category via the admin API.
   */
  async function handleAddCustomCategory() {
    if (!accessKey) {
      setStatus('Admin access required.');
      return;
    }
    const trimmed = customCategory.trim();
    if (!trimmed) {
      setStatus('Enter a category name.');
      return;
    }
    setStatus('');
    try {
      const { response, data } = await addCustomCategory(trimmed, accessKey);
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      if (!response.ok) {
        if (data.reason === 'duplicate') {
          setStatus('Category already exists.');
          return;
        }
        setStatus('Could not add category.');
        return;
      }
      setCustomCategory('');
      setStatus('Category added.');
    } catch {
      setStatus('Could not add category.');
    }
  }

  if (categoryMode === 'multi') {
    return (
      <Panel title="Categories">
        <div className="category-selector-grid">
          {categories.map((category) => (
            <label key={category} className="category-selector-label">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category)}
                onChange={() => handleToggleCategory(category)}
                disabled={!accessKey}
                className="category-selector-checkbox"
              />
              <span className="category-selector-name">{category}</span>
            </label>
          ))}
        </div>
        <div className="category-selector-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRandomCategory}
            disabled={!accessKey}
          >
            Random
          </button>
          <span className="category-selector-count">{selectedCategories.length} selected</span>
        </div>
        <div className="category-selector-row" style={{ marginTop: '0.5rem' }}>
          <input
            type="text"
            className="input flex-1"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="New category..."
            disabled={!accessKey}
            maxLength={50}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAddCustomCategory}
            disabled={!accessKey || !customCategory.trim()}
          >
            Add
          </button>
        </div>
        {status && <p className="category-selector-status">{status}</p>}
      </Panel>
    );
  }

  return (
    <Panel title="Category">
      <div className="category-selector-row">
        <select
          className="input flex-1"
          value={selectedCategory}
          onChange={(e) => handleSelectCategory(e.target.value)}
          disabled={!accessKey}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleRandomCategory}
          disabled={!accessKey}
        >
          Random
        </button>
      </div>
      <div className="category-selector-row" style={{ marginTop: '0.5rem' }}>
        <input
          type="text"
          className="input flex-1"
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
          placeholder="New category..."
          disabled={!accessKey}
          maxLength={50}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleAddCustomCategory}
          disabled={!accessKey || !customCategory.trim()}
        >
          Add
        </button>
      </div>
      {status && <p className="category-selector-status">{status}</p>}
    </Panel>
  );
}
