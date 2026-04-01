import { describe, it, expect } from 'vitest';
import { createConnectionTracker } from '../utils/connection-tracker.js';

describe('connection-tracker', () => {
  it('allows connections below per-IP limit', () => {
    const tracker = createConnectionTracker(3, 50);
    tracker.add('1.2.3.4');
    tracker.add('1.2.3.4');
    expect(tracker.canConnect('1.2.3.4').allowed).toBe(true);
  });

  it('rejects connections at per-IP limit', () => {
    const tracker = createConnectionTracker(2, 50);
    tracker.add('1.2.3.4');
    tracker.add('1.2.3.4');
    const result = tracker.canConnect('1.2.3.4');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('too_many_connections');
    }
  });

  it('rejects connections at global limit', () => {
    const tracker = createConnectionTracker(10, 3);
    tracker.add('1.1.1.1');
    tracker.add('2.2.2.2');
    tracker.add('3.3.3.3');
    const result = tracker.canConnect('4.4.4.4');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('server_busy');
    }
  });

  it('tracks IPs independently', () => {
    const tracker = createConnectionTracker(2, 50);
    tracker.add('1.1.1.1');
    tracker.add('1.1.1.1');
    expect(tracker.canConnect('1.1.1.1').allowed).toBe(false);
    expect(tracker.canConnect('2.2.2.2').allowed).toBe(true);
  });

  it('frees slots when connections are removed', () => {
    const tracker = createConnectionTracker(2, 50);
    tracker.add('1.2.3.4');
    tracker.add('1.2.3.4');
    expect(tracker.canConnect('1.2.3.4').allowed).toBe(false);

    tracker.remove('1.2.3.4');
    expect(tracker.canConnect('1.2.3.4').allowed).toBe(true);
  });

  it('frees global slots when connections are removed', () => {
    const tracker = createConnectionTracker(10, 2);
    tracker.add('1.1.1.1');
    tracker.add('2.2.2.2');
    expect(tracker.canConnect('3.3.3.3').allowed).toBe(false);

    tracker.remove('1.1.1.1');
    expect(tracker.canConnect('3.3.3.3').allowed).toBe(true);
  });

  it('normalises IPv6-mapped IPv4 addresses', () => {
    const tracker = createConnectionTracker(2, 50);
    tracker.add('::ffff:10.0.0.1');
    tracker.add('10.0.0.1');
    expect(tracker.canConnect('::ffff:10.0.0.1').allowed).toBe(false);
    expect(tracker.canConnect('10.0.0.1').allowed).toBe(false);
  });

  it('remove handles unknown IPs gracefully', () => {
    const tracker = createConnectionTracker(5, 50);
    tracker.remove('unknown');
    expect(tracker.getGlobalCount()).toBe(0);
    expect(tracker.getCount('unknown')).toBe(0);
  });

  it('getCount returns current per-IP count', () => {
    const tracker = createConnectionTracker(5, 50);
    expect(tracker.getCount('1.2.3.4')).toBe(0);
    tracker.add('1.2.3.4');
    tracker.add('1.2.3.4');
    expect(tracker.getCount('1.2.3.4')).toBe(2);
  });

  it('getGlobalCount returns total connections', () => {
    const tracker = createConnectionTracker(5, 50);
    tracker.add('1.1.1.1');
    tracker.add('2.2.2.2');
    tracker.add('3.3.3.3');
    expect(tracker.getGlobalCount()).toBe(3);
  });

  it('global limit takes priority over per-IP limit', () => {
    const tracker = createConnectionTracker(10, 2);
    tracker.add('1.1.1.1');
    tracker.add('1.1.1.1');
    // Per-IP has room (2/10), but global is full (2/2)
    const result = tracker.canConnect('1.1.1.1');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('server_busy');
    }
  });
});
