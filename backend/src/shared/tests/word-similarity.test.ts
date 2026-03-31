import { describe, it, expect } from 'vitest';
import { normalizeWord } from '../utils/normalize-word.js';
import {
  damerauLevenshteinDistance,
  calculateSimilarity,
} from '../utils/word-similarity.js';

describe('word-similarity', () => {
  describe('normalizeWord', () => {
    it('lowercases and trims', () => {
      expect(normalizeWord('  Hello  ')).toBe('hello');
    });

    it('handles empty string', () => {
      expect(normalizeWord('')).toBe('');
    });
  });

  describe('damerauLevenshteinDistance', () => {
    it('returns 0 for identical strings', () => {
      expect(damerauLevenshteinDistance('apple', 'apple')).toBe(0);
    });

    it('returns length of other string when one is empty', () => {
      expect(damerauLevenshteinDistance('', 'abc')).toBe(3);
      expect(damerauLevenshteinDistance('abc', '')).toBe(3);
    });

    it('counts single substitution', () => {
      expect(damerauLevenshteinDistance('cat', 'car')).toBe(1);
    });

    it('counts single insertion', () => {
      expect(damerauLevenshteinDistance('cat', 'cats')).toBe(1);
    });

    it('counts single deletion', () => {
      expect(damerauLevenshteinDistance('cats', 'cat')).toBe(1);
    });

    it('counts transposition', () => {
      expect(damerauLevenshteinDistance('ab', 'ba')).toBe(1);
    });

    it('handles multiple edits', () => {
      expect(damerauLevenshteinDistance('kitten', 'sitting')).toBe(3);
    });
  });

  describe('calculateSimilarity', () => {
    it('returns 1 for identical words', () => {
      expect(calculateSimilarity('apple', 'apple')).toBe(1);
    });

    it('returns 0 for completely different words', () => {
      expect(calculateSimilarity('a', 'b')).toBe(0);
    });

    it('returns 1 for two empty strings', () => {
      expect(calculateSimilarity('', '')).toBe(1);
    });

    it('returns correct ratio for similar words', () => {
      // "same" vs "sane" = 1 edit, max length 4, similarity 0.75
      expect(calculateSimilarity('same', 'sane')).toBe(0.75);
    });
  });

});
