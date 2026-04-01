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

describe('App', () => {
  let originalPathname: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPhase = 'active';
    originalPathname = window.location.pathname;
    localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: originalPathname },
      writable: true,
    });
  });

  it('calls plugin render for admin who has not joined as player', () => {
    // Set up admin page with admin session but no player identity
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/admin' },
      writable: true,
    });
    localStorage.setItem('adminSessionId', 'admin-session-123');

    mockUseServerState.mockReturnValue({
      serverState: createFinishedServerState(),
      connection: 'Connected',
    });

    render(<App />);

    expect(mockRender).toHaveBeenCalled();
    expect(screen.getByTestId('game-view')).toBeInTheDocument();
  });

  it('does not render game view for unauthenticated non-player', () => {
    // Not admin, no player ID — no one is authenticated
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/' },
      writable: true,
    });

    mockUseServerState.mockReturnValue({
      serverState: createFinishedServerState(),
      connection: 'Connected',
    });

    render(<App />);

    expect(mockRender).not.toHaveBeenCalled();
    expect(screen.queryByTestId('game-view')).not.toBeInTheDocument();
  });
});
