import { describe, it, expect } from 'vitest';
import { buildWinnerMessage } from '../../utils/winnerMessage';

describe('buildWinnerMessage', () => {
  it('shows "You won!" for a sole current-player win', () => {
    expect(buildWinnerMessage(['Alice'], 'Alice')).toBe('You won! 🎉');
  });

  it('shows "You and {name} won!" for a tie including the current player', () => {
    expect(buildWinnerMessage(['Alice', 'Bob'], 'Alice')).toBe('You and Bob won! 🎉');
  });

  it('joins multiple co-winners with "and"', () => {
    expect(buildWinnerMessage(['Alice', 'Bob', 'Charlie'], 'Alice')).toBe(
      'You and Bob and Charlie won! 🎉'
    );
  });

  it('shows the winner name for another player\'s win', () => {
    expect(buildWinnerMessage(['Bob'], 'Alice')).toBe('Bob wins! 👏');
  });

  it('shows the tie message when the current player did not win', () => {
    expect(buildWinnerMessage(['Bob', 'Charlie'], 'Alice')).toBe(
      'Bob and Charlie tie for the win! 👏'
    );
  });

  it('treats an unknown current player as a non-winner', () => {
    expect(buildWinnerMessage(['Alice'], null)).toBe('Alice wins! 👏');
  });

  it('returns an empty string for empty winner names', () => {
    expect(buildWinnerMessage([], 'Alice')).toBe('');
  });
});
