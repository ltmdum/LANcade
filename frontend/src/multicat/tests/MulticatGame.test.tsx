import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MulticatGame } from '../MulticatGame';
import type { CategoryClashState } from '@lancade/shared';

// Mock fetch globally to prevent API calls
vi.stubGlobal('fetch', vi.fn());

/**
 * Create a base server state for testing.
 */
function createBaseState(): CategoryClashState {
  return {
    serverTime: Date.now(),
    players: [
      { id: 'player-1', name: 'Alice' },
      { id: 'player-2', name: 'Bob' },
    ],
    settings: {
      categories: ['Animals', 'Food', 'Countries'],
      selectedCategory: 'Animals',
      selectedCategories: ['Animals', 'Food', 'Countries'],
      categoryMode: 'multi',
    },
    round: {
      id: 1,
      state: 'idle',
      letter: null,
      category: null,
      categories: ['Animals', 'Food', 'Countries'],
      durationMs: null,
      startedAt: null,
      endsAt: null,
      participants: [],
      scoresByPlayer: {},
      wordsByPlayer: [],
      votesSubmittedIds: [],
      resultsByPlayer: null,
    },
    game: { id: 'multicat', name: 'Category Clash: Multicat' },
    games: [{ id: 'multicat', name: 'Category Clash: Multicat' }],
  };
}

/**
 * Default props for the game component.
 */
function createDefaultProps(serverState: CategoryClashState) {
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

describe('MulticatGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('idle state', () => {
    it('renders waiting panel and volume notice when round is idle', () => {
      const state = createBaseState();
      state.round.state = 'idle';

      render(<MulticatGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Waiting for the game to start...')).toBeInTheDocument();
      expect(screen.getByText('Sound On!')).toBeInTheDocument();
    });
  });

  describe('active state', () => {
    it('renders the active panel with letter display', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letter = 'A';
      state.round.durationMs = 60000;
      state.round.startedAt = Date.now();
      state.round.endsAt = Date.now() + 60000;

      render(<MulticatGame {...createDefaultProps(state)} />);

      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('renders category inputs during active state', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letter = 'B';
      state.round.durationMs = 60000;
      state.round.categories = ['Animals', 'Food'];

      render(<MulticatGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Animals')).toBeInTheDocument();
      expect(screen.getByText('Food')).toBeInTheDocument();
    });

    it('does not render admin controls during active state for non-admin', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letter = 'C';
      state.round.durationMs = 60000;

      render(<MulticatGame {...createDefaultProps(state)} />);

      expect(screen.queryByText(/play again/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/back to config/i)).not.toBeInTheDocument();
    });
  });

  describe('voting state', () => {
    it('renders voting panel with words anonymously', () => {
      const state = createBaseState();
      state.round.state = 'voting';
      state.round.letter = 'A';
      state.round.wordsByPlayer = [
        {
          playerId: 'player-2',
          playerName: 'Bob',
          words: [{ id: 'word-1', word: 'Antelope', category: 'Animals' }],
        },
      ];
      state.round.anonymousWords = [
        { id: 'word-1', word: 'Antelope', category: 'Animals' },
      ];

      render(<MulticatGame {...createDefaultProps(state)} />);

      // The word (with category) is visible but the author's name is not
      expect(screen.getByText(/Antelope/)).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });

    it('does not show other players names during voting', () => {
      const state = createBaseState();
      state.round.state = 'voting';
      state.round.letter = 'A';
      state.round.wordsByPlayer = [
        {
          playerId: 'player-2',
          playerName: 'Bob',
          words: [{ id: 'word-1', word: 'Antelope', category: 'Animals' }],
        },
      ];
      state.round.anonymousWords = [
        { id: 'word-1', word: 'Antelope', category: 'Animals' },
      ];

      render(<MulticatGame {...createDefaultProps(state)} />);

      // The word itself must be visible
      expect(screen.getByText(/Antelope/)).toBeInTheDocument();
      // But Bob's name must not appear anywhere
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });

    it('renders submit votes button', () => {
      const state = createBaseState();
      state.round.state = 'voting';
      state.round.letter = 'A';
      state.round.wordsByPlayer = [];

      render(<MulticatGame {...createDefaultProps(state)} />);

      expect(screen.getByRole('button', { name: /submit votes/i })).toBeInTheDocument();
    });

    it('does not render admin controls during voting state', () => {
      const state = createBaseState();
      state.round.state = 'voting';
      state.round.letter = 'A';

      const props = createDefaultProps(state);
      props.isAdmin = true;
      props.accessKey = 'admin-123';

      render(<MulticatGame {...props} />);

      expect(screen.queryByText(/play again/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/back to config/i)).not.toBeInTheDocument();
    });
  });

  describe('results state', () => {
    it('renders leaderboard and results when player has results', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.letter = 'A';
      state.round.categories = ['Animals', 'Food'];
      state.round.resultsByPlayer = {
        'player-1': {
          name: 'Alice',
          totalSubmitted: 2,
          rejected: 0,
          votedOut: 0,
          finalScore: 2,
          words: [
            {
              word: 'Antelope',
              category: 'Animals',
              status: 'accepted',
              blockedByName: null,
              downvotedByNames: [],
            },
          ],
        },
        'player-2': {
          name: 'Bob',
          totalSubmitted: 1,
          rejected: 0,
          votedOut: 0,
          finalScore: 1,
          words: [],
        },
      };

      render(<MulticatGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Antelope')).toBeInTheDocument();
      expect(screen.getByText('Your Results')).toBeInTheDocument();
    });

    it('renders "no results" message when nobody submitted words', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.letter = 'A';
      state.round.resultsByPlayer = {};

      render(<MulticatGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/no results/i)).toBeInTheDocument();
      expect(screen.getByText(/nobody submitted any words/i)).toBeInTheDocument();
    });

    it('renders admin controls in results state for admin', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.letter = 'A';
      state.round.durationMs = 60000;
      state.round.resultsByPlayer = {
        'player-1': {
          name: 'Alice',
          totalSubmitted: 1,
          rejected: 0,
          votedOut: 0,
          finalScore: 1,
          words: [],
        },
      };

      const props = createDefaultProps(state);
      props.isAdmin = true;
      props.accessKey = 'admin-123';

      render(<MulticatGame {...props} />);

      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to config/i })).toBeInTheDocument();
    });

    it('renders admin controls even when no results exist', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.letter = 'A';
      state.round.durationMs = 60000;
      state.round.resultsByPlayer = {};

      const props = createDefaultProps(state);
      props.isAdmin = true;
      props.accessKey = 'admin-123';

      render(<MulticatGame {...props} />);

      expect(screen.getByText(/no results/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to config/i })).toBeInTheDocument();
    });

    it('non-participating admin sees controls in results state', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.letter = 'A';
      state.round.durationMs = 60000;
      state.round.resultsByPlayer = {};

      const props = createDefaultProps(state);
      props.playerId = '';
      props.playerName = '';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<MulticatGame {...props} />);

      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to config/i })).toBeInTheDocument();
    });

    it('non-participating admin sees active panel without word inputs', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letter = 'A';
      state.round.durationMs = 60000;
      state.round.categories = ['Animals', 'Food'];

      const props = createDefaultProps(state);
      props.playerId = '';
      props.playerName = '';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<MulticatGame {...props} />);

      // Letter shows but no input fields for non-participating admin
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/word/i)).not.toBeInTheDocument();
    });

    it('admin with stale playerId sees active panel without word inputs', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letter = 'A';
      state.round.durationMs = 60000;
      state.round.categories = ['Animals', 'Food'];

      const props = createDefaultProps(state);
      props.playerId = 'stale-id';
      props.playerName = 'Stale';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<MulticatGame {...props} />);

      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/word/i)).not.toBeInTheDocument();
    });

    it('admin with stale playerId sees controls in results state', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.letter = 'A';
      state.round.durationMs = 60000;
      state.round.resultsByPlayer = {};

      const props = createDefaultProps(state);
      props.playerId = 'stale-id';
      props.playerName = 'Stale';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<MulticatGame {...props} />);

      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
    });

    it('renders leaderboard for a player who did not submit any words', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.letter = 'A';
      state.round.categories = ['Animals', 'Food'];
      // player-1 (Alice) has no entry — she never submitted anything.
      // player-2 (Bob) played and has a result.
      state.round.resultsByPlayer = {
        'player-2': {
          name: 'Bob',
          totalSubmitted: 1,
          rejected: 0,
          votedOut: 0,
          finalScore: 1,
          words: [
            {
              word: 'Antelope',
              category: 'Animals',
              status: 'accepted',
              blockedByName: null,
              downvotedByNames: [],
            },
          ],
        },
      };

      // Render as Alice (player-1), who has no personal result entry
      render(<MulticatGame {...createDefaultProps(state)} />);

      // Alice should still see the leaderboard with Bob's result, not the
      // "nobody submitted" fallback.
      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
      expect(screen.getByText(/Bob/)).toBeInTheDocument();
      expect(screen.queryByText(/nobody submitted any words/i)).not.toBeInTheDocument();
    });

    it('does not render admin controls for non-admin in results state', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.letter = 'A';
      state.round.resultsByPlayer = {};

      render(<MulticatGame {...createDefaultProps(state)} />);

      expect(screen.queryByRole('button', { name: /play again/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /back to config/i })).not.toBeInTheDocument();
    });
  });
});
