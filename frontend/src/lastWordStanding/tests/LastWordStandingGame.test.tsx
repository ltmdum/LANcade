import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LastWordStandingGame } from '../LastWordStandingGame';
import type { LastWordStandingState } from '@lancade/shared';

// Mock fetch globally to prevent API calls
vi.stubGlobal('fetch', vi.fn());

// Mock sound functions to prevent AudioContext access in tests
vi.mock('../../shared/utils/sounds', () => ({
  playOkaySound: vi.fn(),
  playWarningSound: vi.fn(),
  warmupAudio: vi.fn(),
  playTickSound: vi.fn(),
  playPopSound: vi.fn(),
}));

/**
 * Create a base server state for testing.
 */
function createBaseState(): LastWordStandingState {
  return {
    serverTime: Date.now(),
    players: [
      { id: 'player-1', name: 'Alice' },
      { id: 'player-2', name: 'Bob' },
      { id: 'player-3', name: 'Charlie' },
    ],
    settings: {
      categories: ['Animals', 'Food', 'Countries'],
      selectedCategory: 'Animals',
    },
    match: {
      id: 1,
      state: 'idle',
      category: 'Animals',
      timeLimitMs: 10000,
      order: ['player-1', 'player-2', 'player-3'],
      activePlayerIds: ['player-1', 'player-2', 'player-3'],
      eliminatedPlayerIds: [],
      currentPlayerId: null,
      currentLetter: null,
      lastChance: false,
      turnStartedAt: null,
      turnEndsAt: null,
      pendingWord: null,
      votes: null,
      usedWords: [],
      lastOutcome: null,
      winnerId: null,
    },
    game: { id: 'lastwordstanding', name: 'Last Word Standing' },
    games: [{ id: 'lastwordstanding', name: 'Last Word Standing' }],
  };
}

/**
 * Default props for the game component.
 */
function createDefaultProps(serverState: LastWordStandingState) {
  return {
    serverState,
    connection: 'connected' as const,
    playerId: 'player-1',
    playerName: 'Alice',
    accessKey: 'KEY123',
    isAdmin: false,
    isParticipating: true,
    setShowConfig: vi.fn(),
  };
}

describe('LastWordStandingGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('idle state', () => {
    it('renders waiting panel and volume notice when match is idle', () => {
      const state = createBaseState();
      state.match.state = 'idle';

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Sound On!')).toBeInTheDocument();
    });
  });

  describe('active state', () => {
    it('renders the active panel with current letter', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'A';
      state.match.currentPlayerId = 'player-1';
      state.match.turnEndsAt = Date.now() + 10000;

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('renders word input form when it is current player turn', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'B';
      state.match.currentPlayerId = 'player-1';
      state.match.turnEndsAt = Date.now() + 10000;

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('clears submission status when turn passes to next player', async () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'A';
      state.match.currentPlayerId = 'player-1';
      state.match.turnEndsAt = Date.now() + 10000;

      const props = createDefaultProps(state);
      const { rerender } = render(<LastWordStandingGame {...props} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Apple' } });

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText('Submitted. Waiting for votes...')).toBeInTheDocument();
      });

      // Transition to voting (same match.id — Bob's word is being voted on)
      state.match.state = 'voting';
      state.match.currentPlayerId = 'player-2';
      state.match.pendingWord = { word: 'Apple', playerId: 'player-1' };
      state.match.votes = {
        submittedIds: [],
        rejectCount: 0,
        acceptCount: 0,
        totalEligible: 2,
        voteEndsAt: Date.now() + 5000,
      };

      rerender(<LastWordStandingGame {...props} />);

      // The voting panel shows, so old status is gone
      expect(screen.queryByText('Submitted. Waiting for votes...')).not.toBeInTheDocument();

      // Transition back to active for next player (same match.id)
      state.match.state = 'active';
      state.match.currentPlayerId = 'player-2';
      state.match.currentLetter = 'B';
      state.match.pendingWord = null;
      state.match.votes = null;
      state.match.turnEndsAt = Date.now() + 10000;

      rerender(<LastWordStandingGame {...props} />);

      // The old submission status must NOT leak into the new turn
      expect(screen.queryByText('Submitted. Waiting for votes...')).not.toBeInTheDocument();
    });

    it('shows current player name', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'C';
      state.match.currentPlayerId = 'player-2';
      state.match.turnEndsAt = Date.now() + 10000;

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      // "Current Turn: Bob" appears in the active panel
      expect(screen.getByText(/Current Turn:/)).toBeInTheDocument();
      expect(screen.getAllByText(/Bob/).length).toBeGreaterThanOrEqual(1);
    });

    it('renders player tag list showing all players', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'D';
      state.match.currentPlayerId = 'player-1';
      state.match.turnEndsAt = Date.now() + 10000;

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('does not render admin controls during active state', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'E';
      state.match.currentPlayerId = 'player-1';
      state.match.turnEndsAt = Date.now() + 10000;

      const props = createDefaultProps(state);
      props.isAdmin = true;
      props.accessKey = 'admin-123';

      render(<LastWordStandingGame {...props} />);

      expect(screen.queryByText(/play again/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/back to config/i)).not.toBeInTheDocument();
    });
  });

  describe('voting state', () => {
    it('renders voting panel with pending word', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentLetter = 'A';
      state.match.currentPlayerId = 'player-2';
      state.match.pendingWord = { word: 'Apple', playerId: 'player-2' };
      state.match.votes = {
        submittedIds: [],
        rejectCount: 0,
        acceptCount: 0,
        totalEligible: 2,
        voteEndsAt: Date.now() + 5000,
      };

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    it('renders accept and reject buttons for non-current players', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentLetter = 'A';
      state.match.currentPlayerId = 'player-2';
      state.match.pendingWord = { word: 'Avocado', playerId: 'player-2' };
      state.match.votes = {
        submittedIds: [],
        rejectCount: 0,
        acceptCount: 0,
        totalEligible: 2,
        voteEndsAt: Date.now() + 5000,
      };

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    it('does not render admin controls during voting state', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentLetter = 'A';
      state.match.currentPlayerId = 'player-2';
      state.match.pendingWord = { word: 'Ant', playerId: 'player-2' };
      state.match.votes = {
        submittedIds: [],
        rejectCount: 0,
        acceptCount: 0,
        totalEligible: 2,
        voteEndsAt: Date.now() + 5000,
      };

      const props = createDefaultProps(state);
      props.isAdmin = true;
      props.accessKey = 'admin-123';

      render(<LastWordStandingGame {...props} />);

      expect(screen.queryByText(/play again/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/back to config/i)).not.toBeInTheDocument();
    });
  });

  describe('finished state', () => {
    it('renders winner display', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-2';

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      // Winner panel shows winner name
      expect(screen.getByText(/winner/i)).toBeInTheDocument();
      // Bob appears in both winner display and player list
      expect(screen.getAllByText(/Bob/).length).toBeGreaterThanOrEqual(1);
    });

    it('renders player tag list in finished state', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-1';
      state.match.eliminatedPlayerIds = ['player-2', 'player-3'];

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      // Players appear in both winner display and player list
      expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Charlie').length).toBeGreaterThanOrEqual(1);
    });

    it('renders admin controls in finished state for admin', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-1';
      state.match.timeLimitMs = 10000;

      const props = createDefaultProps(state);
      props.isAdmin = true;
      props.accessKey = 'admin-123';

      render(<LastWordStandingGame {...props} />);

      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to config/i })).toBeInTheDocument();
    });

    it('does not render admin controls for non-admin in finished state', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-1';

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      expect(screen.queryByRole('button', { name: /play again/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /back to config/i })).not.toBeInTheDocument();
    });
  });

  describe('late joiner', () => {
    it('shows waiting message for player not in match.order during active state', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'A';
      state.match.currentPlayerId = 'player-2';
      state.match.order = ['player-2', 'player-3'];
      state.match.activePlayerIds = ['player-2', 'player-3'];
      state.match.turnEndsAt = Date.now() + 10000;

      const props = createDefaultProps(state);
      props.playerId = 'player-1';

      render(<LastWordStandingGame {...props} />);

      expect(screen.getByText('Sound On!')).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('shows waiting message during voting state', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentLetter = 'A';
      state.match.currentPlayerId = 'player-2';
      state.match.order = ['player-2', 'player-3'];
      state.match.activePlayerIds = ['player-2', 'player-3'];
      state.match.pendingWord = { word: 'Apple', playerId: 'player-2' };
      state.match.votes = {
        submittedIds: [],
        rejectCount: 0,
        acceptCount: 0,
        totalEligible: 1,
        voteEndsAt: Date.now() + 5000,
      };

      const props = createDefaultProps(state);
      props.playerId = 'player-1';

      render(<LastWordStandingGame {...props} />);

      expect(screen.getByText('Sound On!')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    });

    it('shows waiting message during finished state', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-2';
      state.match.order = ['player-2', 'player-3'];
      state.match.activePlayerIds = ['player-2', 'player-3'];

      const props = createDefaultProps(state);
      props.playerId = 'player-1';

      render(<LastWordStandingGame {...props} />);

      expect(screen.getByText('Sound On!')).toBeInTheDocument();
    });

    it('only shows match participants in player tag list', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'A';
      state.match.currentPlayerId = 'player-2';
      state.match.order = ['player-2', 'player-3'];
      state.match.activePlayerIds = ['player-2', 'player-3'];
      state.match.turnEndsAt = Date.now() + 10000;

      const props = createDefaultProps(state);
      props.playerId = 'player-2';
      props.playerName = 'Bob';

      render(<LastWordStandingGame {...props} />);

      // player-1 (Alice) is NOT in match.order — should not appear in player tags
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
      // player-2 and player-3 ARE in match.order — should appear
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('admin sees finished state even when not in match order', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-2';
      state.match.order = ['player-2', 'player-3'];
      state.match.activePlayerIds = ['player-2', 'player-3'];
      state.match.timeLimitMs = 10000;

      const props = createDefaultProps(state);
      props.playerId = '';
      props.playerName = '';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<LastWordStandingGame {...props} />);

      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
    });

    it('non-participating admin sees active panel but no submit form', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'A';
      state.match.currentPlayerId = 'player-2';
      state.match.order = ['player-2', 'player-3'];
      state.match.activePlayerIds = ['player-2', 'player-3'];
      state.match.turnEndsAt = Date.now() + 10000;

      const props = createDefaultProps(state);
      props.playerId = '';
      props.playerName = '';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<LastWordStandingGame {...props} />);

      // Non-participating admin sees the letter but no submit form, no "waiting" message
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByText(/waiting for next game/i)).not.toBeInTheDocument();
    });

    it('admin with stale playerId sees active panel but no submit form', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'A';
      state.match.currentPlayerId = 'player-2';
      state.match.order = ['player-2', 'player-3'];
      state.match.activePlayerIds = ['player-2', 'player-3'];
      state.match.turnEndsAt = Date.now() + 10000;

      const props = createDefaultProps(state);
      props.playerId = 'stale-id';
      props.playerName = 'Stale';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<LastWordStandingGame {...props} />);

      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('admin with stale playerId sees PlayAgainPanel in finished state', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-2';
      state.match.order = ['player-2', 'player-3'];
      state.match.activePlayerIds = ['player-2', 'player-3'];
      state.match.timeLimitMs = 10000;

      const props = createDefaultProps(state);
      props.playerId = 'stale-id';
      props.playerName = 'Stale';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<LastWordStandingGame {...props} />);

      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
      expect(screen.queryByText(/waiting for next game/i)).not.toBeInTheDocument();
    });
  });
});
