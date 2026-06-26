import { describe, expect, it } from 'vitest';
import { classifyAccessKey } from '../utils/access-key.js';

const ADMIN = 'ADMIN001';
const PLAYER = 'PLAYER02';

describe('classifyAccessKey', () => {
  it('identifies an admin key', () => {
    expect(classifyAccessKey(ADMIN, ADMIN, PLAYER)).toBe('admin');
  });

  it('identifies a player key', () => {
    expect(classifyAccessKey(PLAYER, ADMIN, PLAYER)).toBe('player');
  });

  it('returns null for an unknown key of the right length', () => {
    expect(classifyAccessKey('UNKNOWN1', ADMIN, PLAYER)).toBeNull();
  });

  it('returns null for missing or non-string input', () => {
    expect(classifyAccessKey(undefined, ADMIN, PLAYER)).toBeNull();
    expect(classifyAccessKey(null, ADMIN, PLAYER)).toBeNull();
    expect(classifyAccessKey(12345678, ADMIN, PLAYER)).toBeNull();
  });

  it('returns null when length does not match', () => {
    expect(classifyAccessKey('short', ADMIN, PLAYER)).toBeNull();
    expect(classifyAccessKey(ADMIN + 'extra', ADMIN, PLAYER)).toBeNull();
  });

  it('keys of different lengths from each other yield null on a mismatch', () => {
    // If keys ever had different lengths, classification only succeeds for an
    // exact match; otherwise we bail without leaking any timing signal.
    expect(classifyAccessKey('A', 'AB', 'C')).toBeNull();
  });
});
