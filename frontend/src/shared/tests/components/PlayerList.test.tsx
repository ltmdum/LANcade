import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlayerList } from '../../components/PlayerList';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('PlayerList component', () => {
  const defaultPlayers = [
    { id: 'player-1', name: 'Alice' },
    { id: 'player-2', name: 'Bob' },
    { id: 'player-3', name: 'Charlie' },
  ];

  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all player names', () => {
    render(<PlayerList players={defaultPlayers} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('shows "no players" message when list is empty', () => {
    render(<PlayerList players={[]} />);

    expect(screen.getByText(/no players yet/i)).toBeInTheDocument();
  });

  it('does not show eject buttons when no admin session', () => {
    render(<PlayerList players={defaultPlayers} />);

    expect(screen.queryByRole('button', { name: /eject/i })).not.toBeInTheDocument();
  });

  it('shows eject buttons when admin session exists', () => {
    render(<PlayerList players={defaultPlayers} adminSessionId="admin-123" />);

    const ejectButtons = screen.getAllByRole('button', { name: /eject/i });
    expect(ejectButtons.length).toBe(3);
  });

  it('calls API when eject is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });

    render(
      <PlayerList
        players={defaultPlayers}
        adminSessionId="admin-123"
        onExpired={vi.fn()}
      />
    );

    const ejectButtons = screen.getAllByRole('button', { name: /eject/i });
    fireEvent.click(ejectButtons[0]); // Eject Alice

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/eject', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ playerId: 'player-1' }),
      }));
    });
  });

  it('calls onExpired when API returns 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'unauthorized' }),
    });

    const onExpired = vi.fn();
    render(
      <PlayerList
        players={defaultPlayers}
        adminSessionId="admin-123"
        onExpired={onExpired}
      />
    );

    const ejectButtons = screen.getAllByRole('button', { name: /eject/i });
    fireEvent.click(ejectButtons[0]);

    await waitFor(() => {
      expect(onExpired).toHaveBeenCalled();
    });
  });

  it('disables eject button while ejecting', async () => {
    // Create a promise that we can control
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValueOnce(promise);

    render(
      <PlayerList
        players={defaultPlayers}
        adminSessionId="admin-123"
        onExpired={vi.fn()}
      />
    );

    const ejectButtons = screen.getAllByRole('button', { name: /eject/i });
    fireEvent.click(ejectButtons[0]);

    // Button should show "..." while ejecting
    expect(screen.getByText('...')).toBeInTheDocument();

    // Resolve the promise
    resolvePromise!({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });

    await waitFor(() => {
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });
  });
});
