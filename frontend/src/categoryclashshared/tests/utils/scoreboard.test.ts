import { describe, it, expect } from 'vitest';
import { buildScoreboard } from '../../utils/scoreboard';
import type { PlayerResult } from '@lancade/shared';

/**
 * Build a player result with sensible defaults for testing.
 * @param overrides Fields to override.
 * @returns A player result.
 */
function makeResult(overrides: Partial<PlayerResult>): PlayerResult {
  return {
    name: 'Player',
    totalSubmitted: 0,
    rejected: 0,
    votedOut: 0,
    finalScore: 0,
    words: [],
    ...overrides,
  };
}

describe('buildScoreboard', () => {
  it('returns an empty array when there are no results', () => {
    expect(buildScoreboard(null)).toEqual([]);
    expect(buildScoreboard(undefined)).toEqual([]);
  });

  it('sorts by final score descending', () => {
    const entries = buildScoreboard({
      a: makeResult({ name: 'Alice', finalScore: 5 }),
      b: makeResult({ name: 'Bob', finalScore: 12 }),
    });
    expect(entries.map((entry) => entry.playerId)).toEqual(['b', 'a']);
  });

  it('breaks score ties by fewest voted out, then name', () => {
    const entries = buildScoreboard({
      a: makeResult({ name: 'Alice', finalScore: 5, votedOut: 2 }),
      b: makeResult({ name: 'Bob', finalScore: 5, votedOut: 0 }),
      c: makeResult({ name: 'Cara', finalScore: 5, votedOut: 0 }),
    });
    expect(entries.map((entry) => entry.name)).toEqual(['Bob', 'Cara', 'Alice']);
  });
});
