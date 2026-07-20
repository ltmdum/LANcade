import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCountdownTick } from '../../hooks/useCountdownTick';
import { playTickSound } from '../../utils/sounds';

vi.mock('../../utils/sounds', () => ({
  playTickSound: vi.fn(),
  warmupAudio: vi.fn(),
  playPopSound: vi.fn(),
}));

describe('useCountdownTick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('plays a tick at 3 seconds remaining', () => {
    const { rerender } = renderHook(({ ms }) => useCountdownTick(ms), {
      initialProps: { ms: 4000 },
    });
    // 4000ms → ceil = 4, no tick (above 3)
    expect(playTickSound).not.toHaveBeenCalled();

    rerender({ ms: 3000 });
    // 3000ms → ceil = 3, tick
    expect(playTickSound).toHaveBeenCalledTimes(1);

    rerender({ ms: 2000 });
    // 2000ms → ceil = 2, tick
    expect(playTickSound).toHaveBeenCalledTimes(2);

    rerender({ ms: 1000 });
    // 1000ms → ceil = 1, tick
    expect(playTickSound).toHaveBeenCalledTimes(3);
  });

  it('does not replay the same second on re-render', () => {
    const { rerender } = renderHook(({ ms }) => useCountdownTick(ms), {
      initialProps: { ms: 3000 },
    });
    expect(playTickSound).toHaveBeenCalledTimes(1);

    rerender({ ms: 3000 });
    expect(playTickSound).toHaveBeenCalledTimes(1);
  });

  it('does not tick above 3 seconds', () => {
    const { rerender } = renderHook(({ ms }) => useCountdownTick(ms), {
      initialProps: { ms: 10000 },
    });
    expect(playTickSound).not.toHaveBeenCalled();

    rerender({ ms: 5000 });
    expect(playTickSound).not.toHaveBeenCalled();
  });

  it('resets when remainingMs becomes null', () => {
    const { rerender } = renderHook<void, { ms: number | null }>(({ ms }) => useCountdownTick(ms), {
      initialProps: { ms: 3000 },
    });
    expect(playTickSound).toHaveBeenCalledTimes(1);

    rerender({ ms: null });
    rerender({ ms: 3000 });
    expect(playTickSound).toHaveBeenCalledTimes(2);
  });
});
