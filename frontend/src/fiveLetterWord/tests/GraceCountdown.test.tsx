import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GraceCountdown } from '../components/GraceCountdown';

describe('GraceCountdown', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the remaining grace seconds', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const graceEndsAt = Date.now() + 60000;

    render(<GraceCountdown graceEndsAt={graceEndsAt} solved={false} />);

    expect(screen.getByText('60s')).toBeInTheDocument();
    expect(screen.getByText('Someone solved it! Solve before the countdown finishes!')).toBeInTheDocument();
  });

  it('ticks down each second', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const graceEndsAt = Date.now() + 60000;

    render(<GraceCountdown graceEndsAt={graceEndsAt} solved={false} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('59s')).toBeInTheDocument();
  });

  it('shows the solved message for solved players', () => {
    render(<GraceCountdown graceEndsAt={Date.now() + 60000} solved />);

    expect(screen.getByText('You solved it! Waiting for others...')).toBeInTheDocument();
  });

  it('clamps at zero when the grace period has ended', () => {
    render(<GraceCountdown graceEndsAt={Date.now() - 5000} solved={false} />);

    expect(screen.getByText('0s')).toBeInTheDocument();
  });
});
