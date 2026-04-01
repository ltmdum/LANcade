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
    playerName: '',
    setPlayerName: vi.fn(),
    setPlayerPassword: vi.fn(),
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

  /**
   * Type a password into the password input field.
   */
  function typePassword(password: string) {
    const input = screen.getByLabelText(/player password/i);
    fireEvent.change(input, { target: { value: password } });
  }

  it('renders name and password inputs', () => {
    render(<JoinPanel {...defaultProps} />);

    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/player password/i)).toBeInTheDocument();
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
    typePassword('pass123');

    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    expect(screen.getByText(/enter a name/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows error when password is empty on submit', async () => {
    render(<JoinPanel {...defaultProps} playerName="Alice" />);

    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    expect(screen.getByText(/enter the player password/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls API with correct data on submit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ playerId: 'new-player-id', name: 'Alice' }),
    });

    render(<JoinPanel {...defaultProps} playerName="Alice" />);
    typePassword('pass123');

    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/players/join', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Alice', playerId: null, password: 'pass123' }),
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
    const setPlayerPassword = vi.fn();
    render(
      <JoinPanel
        {...defaultProps}
        playerName="Alice"
        setPlayerId={setPlayerId}
        setPlayerName={setPlayerName}
        setPlayerPassword={setPlayerPassword}
      />
    );
    typePassword('pass123');

    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    await waitFor(() => {
      expect(setPlayerId).toHaveBeenCalledWith('new-player-id');
      expect(setPlayerName).toHaveBeenCalledWith('Alice');
      expect(setPlayerPassword).toHaveBeenCalledWith('pass123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('playerId', 'new-player-id');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('playerName', 'Alice');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('playerPassword', 'pass123');
    });
  });

  it('shows error when password is incorrect (401)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'unauthorized' }),
    });

    render(<JoinPanel {...defaultProps} playerName="Alice" />);
    typePassword('wrong');

    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    await waitFor(() => {
      expect(screen.getByText(/incorrect player password/i)).toBeInTheDocument();
    });
  });

  it('shows error when name is taken (409)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ error: 'name_taken' }),
    });

    render(<JoinPanel {...defaultProps} playerName="Alice" />);
    typePassword('pass123');

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
    typePassword('pass123');

    fireEvent.click(screen.getByRole('button', { name: /join game/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/players/join', expect.objectContaining({
        body: JSON.stringify({ name: 'Alice Updated', playerId: 'existing-id', password: 'pass123' }),
      }));
    });
  });

  it('does not call setPlayerPassword on keystroke', () => {
    const setPlayerPassword = vi.fn();
    render(<JoinPanel {...defaultProps} setPlayerPassword={setPlayerPassword} />);

    typePassword('typing...');

    expect(setPlayerPassword).not.toHaveBeenCalled();
  });
});
