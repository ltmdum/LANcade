import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameSelector } from '../../components/GameSelector';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('GameSelector component', () => {
  const defaultProps = {
    games: [
      { id: 'quickfire', name: 'Category Clash: Quick Fire' },
      { id: 'multicat', name: 'Category Clash: Multicat' },
      { id: 'lastwordstanding', name: 'Last Word Standing' },
    ],
    selectedGameId: 'quickfire',
    adminSessionId: 'admin-123',
    onExpired: vi.fn(),
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all game options', () => {
    render(<GameSelector {...defaultProps} />);

    expect(screen.getByText('Category Clash: Quick Fire')).toBeInTheDocument();
    expect(screen.getByText('Category Clash: Multicat')).toBeInTheDocument();
    expect(screen.getByText('Last Word Standing')).toBeInTheDocument();
  });

  it('shows selected game as checked', () => {
    render(<GameSelector {...defaultProps} />);

    const radios = screen.getAllByRole('radio');
    const categoryclash1Radio = radios[0];
    expect(categoryclash1Radio).toBeChecked();
  });

  it('disables radio buttons when no admin session', () => {
    render(<GameSelector {...defaultProps} adminSessionId="" />);

    const radios = screen.getAllByRole('radio');
    radios.forEach((radio) => {
      expect(radio).toBeDisabled();
    });
  });

  it('enables radio buttons when admin session exists', () => {
    render(<GameSelector {...defaultProps} />);

    const radios = screen.getAllByRole('radio');
    radios.forEach((radio) => {
      expect(radio).toBeEnabled();
    });
  });

  it('calls API when selecting a different game', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, selectedGameId: 'lastwordstanding' }),
    });

    render(<GameSelector {...defaultProps} />);

    const wordrushRadio = screen.getAllByRole('radio')[2];
    fireEvent.click(wordrushRadio);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/game', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ gameId: 'lastwordstanding' }),
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
    render(<GameSelector {...defaultProps} onExpired={onExpired} />);

    const wordrushRadio = screen.getAllByRole('radio')[2];
    fireEvent.click(wordrushRadio);

    await waitFor(() => {
      expect(onExpired).toHaveBeenCalled();
    });
  });

  it('shows error message when round is active', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ error: 'round_active' }),
    });

    render(<GameSelector {...defaultProps} />);

    const wordrushRadio = screen.getAllByRole('radio')[2];
    fireEvent.click(wordrushRadio);

    await waitFor(() => {
      expect(screen.getByText(/finish the current round/i)).toBeInTheDocument();
    });
  });

  it('shows info button when game description is provided', () => {
    const getGameDescription = (id: string) => {
      if (id === 'lastwordstanding') return 'A fast-paced word game';
      return undefined;
    };

    render(<GameSelector {...defaultProps} getGameDescription={getGameDescription} />);

    // Should have one info button for wordrush
    const infoButtons = screen.getAllByRole('button', { name: /info about/i });
    expect(infoButtons.length).toBe(1);
  });
});
