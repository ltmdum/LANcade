import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock useServerState to control server state in tests
const mockUseServerState = vi.fn();
vi.mock('./shared/hooks/useServerState', () => ({
  useServerState: (...args: unknown[]) => mockUseServerState(...args),
}));

// Mock the game plugin registry
const mockRender = vi.fn(() => <div data-testid="game-view">Game rendered</div>);
let mockPhase = 'active';
const mockPlugin = {
  config: { id: 'testgame', name: 'Test Game', slogan: '', description: '', instructions: [], roundControlTitle: 'Round', joinPanelTitle: 'Join' },
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
    originalPathname = window.location.pathname;
    localStorage.clear();
  });

  afterEach(() => {
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
});
