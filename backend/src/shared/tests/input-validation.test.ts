import { describe, it, expect } from 'vitest';
import {
  validatePlayerName,
  validateWord,
  validateCategory,
} from '../utils/input-validation.js';

describe('input-validation', () => {
  describe('validatePlayerName', () => {
    it('accepts a valid name', () => {
      const result = validatePlayerName('Alice');
      expect(result).toEqual({ ok: true, value: 'Alice' });
    });

    it('trims whitespace', () => {
      const result = validatePlayerName('  Bob  ');
      expect(result).toEqual({ ok: true, value: 'Bob' });
    });

    it('rejects non-string input', () => {
      expect(validatePlayerName(123)).toEqual({ ok: false, reason: 'name_invalid_type' });
      expect(validatePlayerName(null)).toEqual({ ok: false, reason: 'name_invalid_type' });
      expect(validatePlayerName(undefined)).toEqual({ ok: false, reason: 'name_invalid_type' });
    });

    it('rejects empty string', () => {
      expect(validatePlayerName('')).toEqual({ ok: false, reason: 'name_empty' });
      expect(validatePlayerName('   ')).toEqual({ ok: false, reason: 'name_empty' });
    });

    it('rejects names exceeding 30 characters', () => {
      const longName = 'A'.repeat(31);
      expect(validatePlayerName(longName)).toEqual({ ok: false, reason: 'input_too_long' });
    });

    it('accepts exactly 30 characters', () => {
      const name = 'A'.repeat(30);
      const result = validatePlayerName(name);
      expect(result).toEqual({ ok: true, value: name });
    });
  });

  describe('validateWord', () => {
    it('accepts a valid word', () => {
      expect(validateWord('hello')).toEqual({ ok: true, value: 'hello' });
    });

    it('rejects non-string input', () => {
      expect(validateWord(42)).toEqual({ ok: false, reason: 'word_invalid_type' });
    });

    it('rejects empty string', () => {
      expect(validateWord('')).toEqual({ ok: false, reason: 'word_empty' });
    });

    it('rejects words exceeding 100 characters', () => {
      const longWord = 'a'.repeat(101);
      expect(validateWord(longWord)).toEqual({ ok: false, reason: 'input_too_long' });
    });

    it('accepts exactly 100 characters', () => {
      const word = 'a'.repeat(100);
      expect(validateWord(word)).toEqual({ ok: true, value: word });
    });
  });

  describe('validateCategory', () => {
    it('accepts a valid category', () => {
      expect(validateCategory('Animals')).toEqual({ ok: true, value: 'Animals' });
    });

    it('rejects non-string input', () => {
      expect(validateCategory(false)).toEqual({ ok: false, reason: 'category_invalid_type' });
    });

    it('rejects empty string', () => {
      expect(validateCategory('')).toEqual({ ok: false, reason: 'category_empty' });
    });

    it('rejects categories exceeding 50 characters', () => {
      const longCat = 'A'.repeat(51);
      expect(validateCategory(longCat)).toEqual({ ok: false, reason: 'input_too_long' });
    });

    it('accepts exactly 50 characters', () => {
      const cat = 'A'.repeat(50);
      expect(validateCategory(cat)).toEqual({ ok: true, value: cat });
    });
  });
});
