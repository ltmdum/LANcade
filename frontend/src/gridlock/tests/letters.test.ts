import { describe, it, expect } from 'vitest';
import { validateGridWord } from '../utils/letters';

describe('validateGridWord', () => {
  const tiles = ['A', 'E', 'R', 'N', 'G', 'M', 'L', 'T', 'I'];

  it('accepts a word formable from the tiles and trims it', () => {
    const result = validateGridWord('  triangle  ', tiles);
    expect(result.valid).toBe(true);
    expect(result.trimmedWord).toBe('triangle');
  });

  it('rejects a word using letters not on the grid', () => {
    const result = validateGridWord('zone', tiles);
    expect(result.valid).toBe(false);
    expect(result.errorMessage).toMatch(/not on the grid/i);
  });

  it('rejects reusing a letter more often than it appears', () => {
    // Only one G tile is present, so "gang" needs two G's and is invalid.
    const result = validateGridWord('gang', tiles);
    expect(result.valid).toBe(false);
  });

  it('rejects empty input', () => {
    const result = validateGridWord('   ', tiles);
    expect(result.valid).toBe(false);
  });
});
