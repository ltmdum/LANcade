import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import type { GamePluginConfig } from './plugins/types';

// Mock useServerState to control server state in tests
const mockUseServerState = vi.fn();
vi.mock('./shared/hooks/useServerState', () => ({
  useServerState: (...args: unknown[]) => mockUseServerState(...args),
}));

// Mock the game plugin registry
const mockRender = vi.fn(
  (props: { isAdmin?: boolean; setShowConfig: (show: boolean) => void }) => (
    <div data-testid="game-view">
      Game rendered
      {props.isAdmin && (
        <button type="button" onClick={() => props.setShowConfig(true)}>
          Back to Menu
        </button>
      )}
    </div>
  )
);
let mockPhase = 'active';
const baseConfig: GamePluginConfig = {
  id: 'testgame',
  name: 'Test Game',
  slogan: '',
  description: '',
  instructions: [],
  roundControlTitle: 'Round',
  joinPanelTitle: 'Join',
};
const mockPlugin = {
  config: { ...baseConfig },
  canRender: () => true,
  getPhase: () => mockPhase,
  getHeaderCategory: () => 'Category',
  render: mockRender,
};
vi.mock('./plugins', () => ({
  gamePluginRegistry: {
    getConfig: () => mockPlugin.config,
    findPluginForState: () => mockPlugin,
    getPlugin: () => mockPlugin,
    getAllConfigs: () => [mockPlugin.config],
  },
}));

/**
 * Create a finished-phase server state for testing.
 */
function createFinishedServerState() {
  return {
    serverTime: Date.now(),
    players: [
      { id: 'player-1', name: 'Alice' },
    ],
    settings: {
      categories: [],
      selectedCategory: '',
    },
    game: { id: 'testgame', name: 'Test Game' },
    games: [{ id: 'testgame', name: 'Test Game' }],
    match: { state: 'finished', winnerId: 'player-1' },
  };
}

/**
 * Set the window location pathname for the duration of a test.
 * @param pathname Pathname value to apply.
 */
function setPathname(pathname: string) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, pathname },
    writable: true,
  });
}

describe('App', () => {
  let originalPathname: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPhase = 'active';
    mockPlugin.config = { ...baseConfig };
    originalPathname = window.location.pathname;
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setPathname(originalPathname);
  });

  it('calls plugin render for admin whose playerId is in serverState.players', () => {
    // /admin/<key> path means admin mode. With a known playerId stored,
    // the admin is participating and the game view renders.
    setPathname('/admin/ABCDEFGH');
    localStorage.setItem('playerId', 'player-1');

    mockUseServerState.mockReturnValue({
      serverState: createFinishedServerState(),
      connection: 'Connected',
    });

    render(<App />);

    expect(mockRender).toHaveBeenCalled();
    expect(screen.getByTestId('game-view')).toBeInTheDocument();
  });

  it('calls plugin render for spectator-admin (adminIsPlaying = false)', () => {
    // Admin who has opted out of playing should still see the game view
    // even without a known playerId — canSeeGame is true for non-playing admin.
    setPathname('/admin/ABCDEFGH');
    localStorage.setItem('adminIsPlaying', 'false');

    mockUseServerState.mockReturnValue({
      serverState: createFinishedServerState(),
      connection: 'Connected',
    });

    render(<App />);

    expect(mockRender).toHaveBeenCalled();
    expect(screen.getByTestId('game-view')).toBeInTheDocument();
  });

  it('does not render game view for unauthenticated non-player', () => {
    // No /admin/<key> or /p/<key> path — access.mode is 'none'.
    setPathname('/');

    mockUseServerState.mockReturnValue({
      serverState: createFinishedServerState(),
      connection: 'Connected',
    });

    render(<App />);

    expect(mockRender).not.toHaveBeenCalled();
    expect(screen.queryByTestId('game-view')).not.toBeInTheDocument();
  });

  it('shows the 3-2-1-GO countdown while a round start is pending', () => {
    setPathname('/admin/ABCDEFGH');
    localStorage.setItem('playerId', 'player-1');
    mockUseServerState.mockReturnValue({
      serverState: {
        ...createFinishedServerState(),
        pendingStart: { startedAt: Date.now(), startsAt: Date.now() + 3000 },
      },
      connection: 'Connected',
    });

    render(<App />);

    const overlay = document.querySelector('.start-countdown-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toBe('3');
  });

  it('does not show the countdown without a pending start', () => {
    setPathname('/admin/ABCDEFGH');
    localStorage.setItem('playerId', 'player-1');
    mockPhase = 'active';
    mockUseServerState.mockReturnValue({
      serverState: createFinishedServerState(),
      connection: 'Connected',
    });

    render(<App />);

    expect(document.querySelector('.start-countdown-overlay')).toBeNull();
  });

  it('plays the countdown when entering a configured phase mid-session', () => {
    setPathname('/admin/ABCDEFGH');
    localStorage.setItem('playerId', 'player-1');
    mockPlugin.config = { ...baseConfig, countdownPhases: ['playing'] };
    mockPhase = 'round_complete';
    mockUseServerState.mockReturnValue({
      serverState: createFinishedServerState(),
      connection: 'Connected',
    });

    const { rerender } = render(<App />);
    expect(document.querySelector('.start-countdown-overlay')).toBeNull();

    mockPhase = 'playing';
    mockUseServerState.mockReturnValue({
      serverState: createFinishedServerState(),
      connection: 'Connected',
    });
    rerender(<App />);

    const overlay = document.querySelector('.start-countdown-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toBe('3');
  });

  it('does not replay the countdown when a round starts after an admin start', () => {
    setPathname('/admin/ABCDEFGH');
    localStorage.setItem('playerId', 'player-1');
    mockPlugin.config = { ...baseConfig, countdownPhases: ['playing'] };
    mockPhase = 'idle';
    mockUseServerState.mockReturnValue({
      serverState: {
        ...createFinishedServerState(),
        pendingStart: { startedAt: Date.now(), startsAt: Date.now() + 3000 },
      },
      connection: 'Connected',
    });

    const { rerender } = render(<App />);
    expect(document.querySelector('.start-countdown-overlay')).not.toBeNull();

    mockPhase = 'playing';
    mockUseServerState.mockReturnValue({
      serverState: createFinishedServerState(),
      connection: 'Connected',
    });
    rerender(<App />);

    // The pending-start overlay ends with the round; no fresh countdown.
    expect(document.querySelector('.start-countdown-overlay')).toBeNull();
  });

  it.each(['results', 'finished'])('shows the app download links when the medal tally is displayed (%s phase)', (phase) => {
    setPathname('/p/ABCDEFGH');
    mockPhase = phase;
    mockUseServerState.mockReturnValue({
      serverState: createFinishedServerState(),
      connection: 'Connected',
    });

    render(<App />);
    expect(screen.getByText(/Enjoying the games/i)).toBeDefined();
  });

  it('does not show the app download links during an active game phase', () => {
    setPathname('/p/ABCDEFGH');
    mockPhase = 'playing';
    mockUseServerState.mockReturnValue({
      serverState: createFinishedServerState(),
      connection: 'Connected',
    });

    render(<App />);
    expect(screen.queryByText(/Enjoying the games/i)).toBeNull();
  });

  it('recreates a fresh instance of the same game when going back to the menu after finishing', async () => {
    setPathname('/admin/ABCDEFGH');
    localStorage.setItem('playerId', 'player-1');

    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    // Mount during an active phase so the config auto-closes and the game view shows.
    mockPhase = 'active';
    mockUseServerState.mockReturnValue({
      serverState: createFinishedServerState(),
      connection: 'Connected',
    });
    const { rerender } = render(<App />);

    // The game finishes and the admin returns to the menu.
    mockPhase = 'finished';
    mockUseServerState.mockReturnValue({
      serverState: { ...createFinishedServerState() },
      connection: 'Connected',
    });
    rerender(<App />);

    fireEvent.click(screen.getByRole('button', { name: /back to menu/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/game',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ gameId: 'testgame', key: 'ABCDEFGH' }),
        })
      )
    );
  });

  it('does not wipe the game when going back to the menu before it has finished', async () => {
    setPathname('/admin/ABCDEFGH');
    localStorage.setItem('playerId', 'player-1');
    mockPhase = 'active';
    mockUseServerState.mockReturnValue({
      serverState: createFinishedServerState(),
      connection: 'Connected',
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /back to menu/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/admin/game',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ gameId: 'testgame', key: 'ABCDEFGH' }),
      })
    );
  });
});
