import { describe, it, expect } from 'vitest';
import { canFormWordFromTiles } from '@lancade/shared';

describe('canFormWordFromTiles', () => {
  const tiles = ['N', 'O', 'T', 'E', 'B', 'O', 'O', 'K', 'S'];

  it('accepts a word formable from the tiles', () => {
    expect(canFormWordFromTiles('NOTE', tiles)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(canFormWordFromTiles('note', tiles)).toBe(true);
  });

  it('allows a repeated letter when enough tiles exist', () => {
    expect(canFormWordFromTiles('BOO', tiles)).toBe(true);
  });

  it('rejects reusing a letter more often than it appears', () => {
    // Only one T tile is available.
    expect(canFormWordFromTiles('TT', tiles)).toBe(false);
  });

  it('rejects words using letters not present', () => {
    expect(canFormWordFromTiles('ZONE', tiles)).toBe(false);
  });

  it('rejects empty and non-letter input', () => {
    expect(canFormWordFromTiles('', tiles)).toBe(false);
    expect(canFormWordFromTiles('NO-TE', tiles)).toBe(false);
  });
});
