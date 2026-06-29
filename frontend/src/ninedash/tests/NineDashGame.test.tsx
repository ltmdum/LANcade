import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NineDashGame } from '../NineDashGame';
import type { CategoryClashState } from '@lancade/shared';

vi.stubGlobal('fetch', vi.fn());

const TILES = ['T', 'R', 'I', 'A', 'N', 'G', 'L', 'E', 'S'];

function createBaseState(): CategoryClashState {
  return {
    serverTime: Date.now(),
    players: [
      { id: 'player-1', name: 'Alice' },
      { id: 'player-2', name: 'Bob' },
    ],
    settings: { categories: [], selectedCategory: '' },
    round: {
      id: 1,
      state: 'idle',
      letter: null,
      letters: null,
      category: null,
      categories: [],
      durationMs: null,
      startedAt: null,
      endsAt: null,
      participants: [],
      scoresByPlayer: {},
      wordsByPlayer: [],
      votesSubmittedIds: [],
      resultsByPlayer: null,
    },
    game: { id: 'ninedash', name: 'Nine Dash' },
    games: [{ id: 'ninedash', name: 'Nine Dash' }],
  };
}

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

describe('NineDashGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when round is idle', () => {
    const state = createBaseState();
    const { container } = render(<NineDashGame {...createDefaultProps(state)} />);
    expect(container.firstChild).toBeNull();
  });

  describe('active state', () => {
    it('renders the nine letter tiles and word input', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letters = TILES;
      state.round.durationMs = 120000;

      render(<NineDashGame {...createDefaultProps(state)} />);

      for (const tile of TILES) {
        expect(screen.getByText(tile)).toBeInTheDocument();
      }
      expect(screen.getByPlaceholderText(/make a word from the tiles/i)).toBeInTheDocument();
    });

    it('shows the player score', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letters = TILES;
      state.round.durationMs = 120000;
      state.round.scoresByPlayer = { 'player-1': 7 };

      render(<NineDashGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Score: 7/)).toBeInTheDocument();
    });

    it('hides the word input for a non-participating admin', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letters = TILES;
      state.round.durationMs = 120000;

      const props = createDefaultProps(state);
      props.playerId = '';
      props.isAdmin = true;
      props.isParticipating = false;

      render(<NineDashGame {...props} />);

      expect(screen.queryByPlaceholderText(/make a word/i)).not.toBeInTheDocument();
    });
  });

  describe('voting state', () => {
    it('renders words anonymously without author names', () => {
      const state = createBaseState();
      state.round.state = 'voting';
      state.round.letters = TILES;
      state.round.wordsByPlayer = [
        { playerId: 'player-2', playerName: 'Bob', words: [{ id: 'w1', word: 'TRIANGLE', category: '' }] },
      ];
      state.round.anonymousWords = [{ id: 'w1', word: 'TRIANGLE', category: '' }];

      render(<NineDashGame {...createDefaultProps(state)} />);

      expect(screen.getByText('TRIANGLE')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit votes/i })).toBeInTheDocument();
    });
  });

  describe('results state', () => {
    it('renders the leaderboard and the player results', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.letters = TILES;
      state.round.resultsByPlayer = {
        'player-1': {
          name: 'Alice',
          totalSubmitted: 1,
          rejected: 0,
          votedOut: 0,
          finalScore: 8,
          words: [
            { word: 'TRIANGLE', category: '', status: 'accepted', blockedByName: null, downvotedByNames: [] },
          ],
        },
      };

      render(<NineDashGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
      expect(screen.getByText('Your Results')).toBeInTheDocument();
      expect(screen.getByText('TRIANGLE')).toBeInTheDocument();
    });

    it('renders a no-results message when nobody submitted', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.letters = TILES;
      state.round.resultsByPlayer = {};

      render(<NineDashGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/nobody submitted any words/i)).toBeInTheDocument();
    });
  });
});
