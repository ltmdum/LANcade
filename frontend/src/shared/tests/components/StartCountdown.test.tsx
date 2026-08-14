import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { StartCountdown } from '../../components/StartCountdown';
import { playTickSound, playPopSound } from '../../utils/sounds';

vi.mock('../../utils/sounds', () => ({
  playTickSound: vi.fn(),
  playPopSound: vi.fn(),
  warmupAudio: vi.fn(),
  playOkaySound: vi.fn(),
  playWarningSound: vi.fn(),
  playWinSound: vi.fn(),
}));

describe('StartCountdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down 3, 2, 1, GO at one-second intervals and then disappears', () => {
    vi.useFakeTimers();
    render(<StartCountdown />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toBe('3');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('status').textContent).toBe('2');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('status').textContent).toBe('1');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('status').textContent).toBe('GO');

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('ticks on 3, 2 and 1 and pops once on GO', () => {
    vi.useFakeTimers();
    render(<StartCountdown />);

    expect(playTickSound).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(playTickSound).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(playTickSound).toHaveBeenCalledTimes(3);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(playTickSound).toHaveBeenCalledTimes(3);
    expect(playPopSound).toHaveBeenCalledTimes(1);
  });
});