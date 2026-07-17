import { describe, it, expect } from 'vitest';
import { getWordsOfLength, getAnswerWordsOfLength, pickRandomWordOfLength } from '../utils/word-list.js';

describe('word-list', () => {
  describe('getWordsOfLength', () => {
    it('returns words of the correct length for length 5', () => {
      const words = getWordsOfLength(5);
      expect(words.length).toBeGreaterThan(1000);
      expect(words.every((w) => w.length === 5)).toBe(true);
    });

    it('returns all uppercase words', () => {
      const words = getWordsOfLength(5);
      expect(words.every((w) => /^[A-Z]+$/.test(w))).toBe(true);
    });

    it('caches results across calls', () => {
      const a = getWordsOfLength(5);
      const b = getWordsOfLength(5);
      expect(a).toBe(b);
    });

    it('has the expected number of 5-letter words', () => {
      expect(getWordsOfLength(5).length).toBe(12578);
    });
  });

  describe('getAnswerWordsOfLength', () => {
    it('returns curated 5-letter answer words', () => {
      const words = getAnswerWordsOfLength(5);
      expect(words.length).toBeGreaterThan(1000);
      expect(words.every((w) => w.length === 5)).toBe(true);
    });

    it('returns curated 9-letter answer words', () => {
      const words = getAnswerWordsOfLength(9);
      expect(words.length).toBeGreaterThan(100);
      expect(words.every((w) => w.length === 9)).toBe(true);
    });
  });

  describe('pickRandomWordOfLength', () => {
    it('picks a word of the correct length', () => {
      const word = pickRandomWordOfLength(5);
      expect(word.length).toBe(5);
    });

    it('uses the provided word list when given', () => {
      const words = ['ALPHA', 'BETA', 'GAMMA'];
      const picked = pickRandomWordOfLength(5, words, () => 0);
      expect(picked).toBe('ALPHA');
    });
  });
});
