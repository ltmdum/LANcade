import { describe, it, expect } from 'vitest';
import { toggleVoteSelection } from '../../utils/voting';

describe('toggleVoteSelection', () => {
  it('adds word ID when not present', () => {
    const initial = new Set<string>(['a', 'b']);
    const result = toggleVoteSelection(initial, 'c');
    expect(result.has('c')).toBe(true);
    expect(result.size).toBe(3);
  });

  it('removes word ID when present', () => {
    const initial = new Set<string>(['a', 'b', 'c']);
    const result = toggleVoteSelection(initial, 'b');
    expect(result.has('b')).toBe(false);
    expect(result.size).toBe(2);
  });

  it('does not mutate original set', () => {
    const initial = new Set<string>(['a', 'b']);
    toggleVoteSelection(initial, 'c');
    expect(initial.has('c')).toBe(false);
    expect(initial.size).toBe(2);
  });

  it('works with empty set', () => {
    const initial = new Set<string>();
    const result = toggleVoteSelection(initial, 'a');
    expect(result.has('a')).toBe(true);
    expect(result.size).toBe(1);
  });
});
