import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter } from '../utils/rate-limiter.js';

describe('rate-limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests below the threshold', () => {
    const limiter = createRateLimiter(3, 1000);
    limiter.recordFailure('1.2.3.4');
    limiter.recordFailure('1.2.3.4');
    expect(limiter.isBlocked('1.2.3.4')).toBe(0);
  });

  it('blocks after reaching the threshold', () => {
    const limiter = createRateLimiter(3, 60_000);
    limiter.recordFailure('1.2.3.4');
    limiter.recordFailure('1.2.3.4');
    const justBlocked = limiter.recordFailure('1.2.3.4');
    expect(justBlocked).toBe(true);
    expect(limiter.isBlocked('1.2.3.4')).toBeGreaterThan(0);
  });

  it('returns remaining seconds when blocked', () => {
    const limiter = createRateLimiter(1, 60_000);
    limiter.recordFailure('1.2.3.4');
    const remaining = limiter.isBlocked('1.2.3.4');
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(60);
  });

  it('unblocks after cooldown expires', () => {
    const limiter = createRateLimiter(1, 1000);
    limiter.recordFailure('1.2.3.4');
    expect(limiter.isBlocked('1.2.3.4')).toBeGreaterThan(0);

    vi.advanceTimersByTime(1001);
    expect(limiter.isBlocked('1.2.3.4')).toBe(0);
  });

  it('tracks IPs independently', () => {
    const limiter = createRateLimiter(2, 60_000);
    limiter.recordFailure('1.1.1.1');
    limiter.recordFailure('1.1.1.1');
    limiter.recordFailure('2.2.2.2');

    expect(limiter.isBlocked('1.1.1.1')).toBeGreaterThan(0);
    expect(limiter.isBlocked('2.2.2.2')).toBe(0);
  });

  it('normalises IPv6-mapped IPv4 addresses', () => {
    const limiter = createRateLimiter(2, 60_000);
    limiter.recordFailure('::ffff:10.0.0.1');
    limiter.recordFailure('10.0.0.1');

    expect(limiter.isBlocked('::ffff:10.0.0.1')).toBeGreaterThan(0);
    expect(limiter.isBlocked('10.0.0.1')).toBeGreaterThan(0);
  });

  it('reset clears attempt count', () => {
    const limiter = createRateLimiter(2, 60_000);
    limiter.recordFailure('1.2.3.4');
    limiter.reset('1.2.3.4');
    limiter.recordFailure('1.2.3.4');
    expect(limiter.isBlocked('1.2.3.4')).toBe(0);
  });

  it('recordFailure returns false when not yet blocked', () => {
    const limiter = createRateLimiter(3, 60_000);
    expect(limiter.recordFailure('1.2.3.4')).toBe(false);
    expect(limiter.recordFailure('1.2.3.4')).toBe(false);
  });

  it('cleans up stale entries on check', () => {
    const limiter = createRateLimiter(1, 1000);
    limiter.recordFailure('1.1.1.1');
    limiter.recordFailure('2.2.2.2');

    expect(limiter.isBlocked('1.1.1.1')).toBeGreaterThan(0);

    vi.advanceTimersByTime(1001);
    // Both should be cleaned up and unblocked
    expect(limiter.isBlocked('1.1.1.1')).toBe(0);
    expect(limiter.isBlocked('2.2.2.2')).toBe(0);
  });

  it('allows new attempts after cooldown expires', () => {
    const limiter = createRateLimiter(2, 1000);
    limiter.recordFailure('1.2.3.4');
    limiter.recordFailure('1.2.3.4');
    expect(limiter.isBlocked('1.2.3.4')).toBeGreaterThan(0);

    vi.advanceTimersByTime(1001);
    expect(limiter.isBlocked('1.2.3.4')).toBe(0);

    // Can accumulate new failures
    limiter.recordFailure('1.2.3.4');
    expect(limiter.isBlocked('1.2.3.4')).toBe(0);
    limiter.recordFailure('1.2.3.4');
    expect(limiter.isBlocked('1.2.3.4')).toBeGreaterThan(0);
  });
});
