import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JoinPanel } from '../../components/JoinPanel';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

describe('JoinPanel component', () => {
  const defaultProps = {
    accessKey: 'KEY123',
    playerName: '',
    setPlayerName: vi.fn(),
    playerId: '',
    setPlayerId: vi.fn(),
  };

  beforeEach(() => {
    mockFetch.mockReset();
    localStorageMock.setItem.mockReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the name input', () => {
    render(<JoinPanel {...defaultProps} />);

    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
  });

  it('renders join button', () => {
    render(<JoinPanel {...defaultProps} />);

    expect(screen.getByRole('button', { name: /join game/i })).toBeInTheDocument();
  });

  it('uses custom title when provided', () => {
    render(<JoinPanel {...defaultProps} title="Join the Round" />);

    expect(screen.getByText('Join the Round')).toBeInTheDocument();
  });

  it('shows error when name is empty on submit', async () => {
    render(<JoinPanel {...defaultProps} playerName="" />);

    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    expect(screen.getByText(/enter a name/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows error when accessKey is missing', async () => {
    render(<JoinPanel {...defaultProps} accessKey="" playerName="Alice" />);

    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    expect(screen.getByText(/invite link/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls API with correct data on submit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ playerId: 'new-player-id', name: 'Alice' }),
    });

    render(<JoinPanel {...defaultProps} playerName="Alice" />);

    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/players/join', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Alice', playerId: null, key: 'KEY123' }),
      }));
    });
  });

  it('updates state and localStorage on successful join', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ playerId: 'new-player-id', name: 'Alice' }),
    });

    const setPlayerId = vi.fn();
    const setPlayerName = vi.fn();
    render(
      <JoinPanel
        {...defaultProps}
        playerName="Alice"
        setPlayerId={setPlayerId}
        setPlayerName={setPlayerName}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    await waitFor(() => {
      expect(setPlayerId).toHaveBeenCalledWith('new-player-id');
      expect(setPlayerName).toHaveBeenCalledWith('Alice');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('playerId', 'new-player-id');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('playerName', 'Alice');
    });
  });

  it('shows error when key is invalid (401)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'unauthorized' }),
    });

    render(<JoinPanel {...defaultProps} playerName="Alice" />);

    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid invite link/i)).toBeInTheDocument();
    });
  });

  it('shows error when name is taken (409)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ error: 'name_taken' }),
    });

    render(<JoinPanel {...defaultProps} playerName="Alice" />);

    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is taken/i)).toBeInTheDocument();
    });
  });

  it('includes existing playerId when rejoining', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ playerId: 'existing-id', name: 'Alice Updated' }),
    });

    render(
      <JoinPanel
        {...defaultProps}
        playerName="Alice Updated"
        playerId="existing-id"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/players/join', expect.objectContaining({
        body: JSON.stringify({ name: 'Alice Updated', playerId: 'existing-id', key: 'KEY123' }),
      }));
    });
  });
});
