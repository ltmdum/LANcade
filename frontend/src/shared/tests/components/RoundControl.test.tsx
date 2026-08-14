import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoundControl } from '../../components/RoundControl';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('RoundControl component', () => {
  const defaultProps = {
    accessKey: 'admin-123',
    onUnauthorized: vi.fn(),
    onRoundStarted: vi.fn(),
    playerCount: 2,
    minPlayers: 2,
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders minutes and seconds selectors', () => {
    render(<RoundControl {...defaultProps} />);

    expect(screen.getByLabelText(/minutes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/seconds/i)).toBeInTheDocument();
  });

  it('renders start button', () => {
    render(<RoundControl {...defaultProps} />);

    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('enables start button when access key exists and player requirements met', () => {
    render(<RoundControl {...defaultProps} />);

    expect(screen.getByRole('button', { name: /start/i })).toBeEnabled();
  });

  it('disables start button when no access key', () => {
    render(<RoundControl {...defaultProps} accessKey="" />);

    expect(screen.getByRole('button', { name: /start/i })).toBeDisabled();
  });

  it('disables start button when player count below minimum', () => {
    render(<RoundControl {...defaultProps} playerCount={1} minPlayers={2} />);

    expect(screen.getByRole('button', { name: /start/i })).toBeDisabled();
    expect(screen.getByText(/more players needed/i)).toBeInTheDocument();
  });

  it('disables start button when admin needs to join as player', () => {
    render(<RoundControl {...defaultProps} needsToJoinAsPlayer={true} />);

    expect(screen.getByRole('button', { name: /start/i })).toBeDisabled();
    expect(screen.getByText(/join as a player before starting/i)).toBeInTheDocument();
  });

  it('shows join-required message on start click when needsToJoinAsPlayer', async () => {
    render(<RoundControl {...defaultProps} needsToJoinAsPlayer={true} />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    await waitFor(() => {
      expect(screen.getByText(/join as a player before starting the game/i)).toBeInTheDocument();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('uses custom title when provided', () => {
    render(<RoundControl {...defaultProps} title="Match Control" />);

    expect(screen.getByText('Match Control')).toBeInTheDocument();
  });

  it('uses default timer values', () => {
    render(<RoundControl {...defaultProps} defaultMinutes="02" defaultSeconds="00" />);

    const minutesSelect = screen.getByLabelText(/minutes/i) as HTMLSelectElement;
    const secondsSelect = screen.getByLabelText(/seconds/i) as HTMLSelectElement;

    expect(minutesSelect.value).toBe('02');
    expect(secondsSelect.value).toBe('00');
  });

  it('calls API when start is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, roundId: 1 }),
    });

    render(<RoundControl {...defaultProps} defaultMinutes="01" defaultSeconds="30" />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/start', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ durationMs: 90000, key: 'admin-123' }), // 1 min 30 sec
      }));
    });
  });

  it('calls onRoundStarted when API succeeds', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, roundId: 1 }),
    });

    const onRoundStarted = vi.fn();
    render(<RoundControl {...defaultProps} onRoundStarted={onRoundStarted} />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    await waitFor(() => {
      expect(onRoundStarted).toHaveBeenCalled();
    });
  });

  it('calls onUnauthorized when API returns 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'unauthorized' }),
    });

    const onUnauthorized = vi.fn();
    render(<RoundControl {...defaultProps} onUnauthorized={onUnauthorized} />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    await waitFor(() => {
      expect(onUnauthorized).toHaveBeenCalled();
    });
  });

  it('shows error message when API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'server_error' }),
    });

    render(<RoundControl {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    await waitFor(() => {
      expect(screen.getByText(/could not start/i)).toBeInTheDocument();
    });
  });

  it('hides timer selectors when hideTimer is true', () => {
    render(<RoundControl {...defaultProps} hideTimer={true} />);

    expect(screen.queryByLabelText(/minutes/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/seconds/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('renders custom duration dropdown instead of minutes/seconds', () => {
    render(
      <RoundControl
        {...defaultProps}
        customDuration={{
          label: 'Rounds',
          options: [
            { label: '2 rounds', durationMs: 2000 },
            { label: '3 rounds', durationMs: 3000 },
          ],
        }}
      />
    );

    expect(screen.getByLabelText(/rounds/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/minutes/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/seconds/i)).not.toBeInTheDocument();
  });

  it('sends custom duration when custom duration is configured', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, roundId: 1 }),
    });

    render(
      <RoundControl
        {...defaultProps}
        customDuration={{
          label: 'Rounds',
          options: [
            { label: '2 rounds', durationMs: 2000 },
            { label: '3 rounds', durationMs: 3000 },
          ],
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/start', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ durationMs: 2000, key: 'admin-123' }),
      }));
    });
  });

  it('calls API with dummy duration when hideTimer is true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, roundId: 1 }),
    });

    render(<RoundControl {...defaultProps} hideTimer={true} />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/start', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ durationMs: 1000, key: 'admin-123' }),
      }));
    });
  });
});
