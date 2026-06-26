import { describe, it, expect } from 'vitest';
import { generateGrid, GRID_SIZE } from '../grid.js';
import { pickRandomNineLetterWord, loadNineLetterWords } from '../word-source.js';

/**
 * Sort the characters of a string for multiset comparison.
 * @param value Input string.
 * @returns Characters sorted alphabetically.
 */
function sortLetters(value: string): string {
  return value.split('').sort().join('');
}

describe('gridlock grid', () => {
  it('produces nine tiles that are a permutation of the source word', () => {
    const grid = generateGrid({ word: 'NOTEBOOKS' });
    expect(grid.word).toBe('NOTEBOOKS');
    expect(grid.letters).toHaveLength(GRID_SIZE);
    expect(sortLetters(grid.letters.join(''))).toBe(sortLetters('NOTEBOOKS'));
  });

  it('jumbles the tiles so they do not match the source word order', () => {
    const grid = generateGrid({ word: 'NOTEBOOKS', rng: () => 0 });
    expect(grid.letters.join('')).not.toBe('NOTEBOOKS');
  });

  it('uppercases a lowercase seed word', () => {
    const grid = generateGrid({ word: 'wonderful' });
    expect(grid.word).toBe('WONDERFUL');
    expect(grid.letters.every((letter) => letter >= 'A' && letter <= 'Z')).toBe(true);
  });

  it('picks a random nine-letter word from the bundled source', () => {
    const word = pickRandomNineLetterWord(undefined, () => 0);
    expect(word).toHaveLength(GRID_SIZE);
    expect(/^[A-Z]{9}$/.test(word)).toBe(true);
  });

  it('loads a non-empty bundled word list', () => {
    expect(loadNineLetterWords().length).toBeGreaterThan(1000);
  });
});
