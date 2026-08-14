import { describe, it, expect } from 'vitest';
import { checkPlayerRequirements } from '../../utils/playerRequirements';

describe('checkPlayerRequirements', () => {
  it('returns canStart true when player count meets minimum', () => {
    const result = checkPlayerRequirements(2, 2);
    expect(result.canStart).toBe(true);
    expect(result.waitingMessage).toBeUndefined();
  });

  it('returns canStart true when player count exceeds minimum', () => {
    const result = checkPlayerRequirements(5, 2);
    expect(result.canStart).toBe(true);
    expect(result.waitingMessage).toBeUndefined();
  });

  it('returns canStart false with message when player count is below minimum', () => {
    const result = checkPlayerRequirements(1, 2);
    expect(result.canStart).toBe(false);
    expect(result.waitingMessage).toBe('More players needed.');
  });

  it('returns canStart false with message when no players and minimum is 1', () => {
    const result = checkPlayerRequirements(0, 1);
    expect(result.canStart).toBe(false);
    expect(result.waitingMessage).toBe('More players needed.');
  });

  it('returns canStart true when minimum is 0', () => {
    const result = checkPlayerRequirements(0, 0);
    expect(result.canStart).toBe(true);
    expect(result.waitingMessage).toBeUndefined();
  });

  it('returns canStart false when minimum is undefined (defaults to 1) and no players', () => {
    const result = checkPlayerRequirements(0, undefined);
    expect(result.canStart).toBe(false);
    expect(result.waitingMessage).toBe('More players needed.');
  });

  it('returns canStart true when minimum is undefined (defaults to 1) and has 1 player', () => {
    const result = checkPlayerRequirements(1, undefined);
    expect(result.canStart).toBe(true);
    expect(result.waitingMessage).toBeUndefined();
  });

  it('handles exactly 1 player with minimum of 1', () => {
    const result = checkPlayerRequirements(1, 1);
    expect(result.canStart).toBe(true);
    expect(result.waitingMessage).toBeUndefined();
  });
});
