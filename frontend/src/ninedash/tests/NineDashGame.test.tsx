import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NineDashGame } from '../NineDashGame';
import type { CategoryClashState } from '@lancade/shared';

vi.stubGlobal('fetch', vi.fn());

vi.mock('../../shared/utils/sounds', () => ({
  playOkaySound: vi.fn(),
  playWarningSound: vi.fn(),
  playWinSound: vi.fn(),
  playTickSound: vi.fn(),
  playPopSound: vi.fn(),
  warmupAudio: vi.fn(),
}));

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

import { playWinSound } from '../../shared/utils/sounds';

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
      winnerIds: [],
      winnerNames: [],
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

  it('renders waiting panel and volume notice when round is idle', () => {
    const state = createBaseState();
    render(<NineDashGame {...createDefaultProps(state)} />);
    expect(screen.getByText('Waiting for the game to start...')).toBeInTheDocument();
    expect(screen.getByText('Sound On!')).toBeInTheDocument();
  });

  describe('active state', () => {
    it('renders the nine letter tiles and input placeholder', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letters = TILES;
      state.round.durationMs = 120000;

      render(<NineDashGame {...createDefaultProps(state)} />);

      for (const tile of TILES) {
        expect(screen.getByText(tile)).toBeInTheDocument();
      }
      expect(screen.getByPlaceholderText(/tap letters to make a word/i)).toBeInTheDocument();
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

      expect(screen.queryByPlaceholderText(/tap letters to make a word/i)).not.toBeInTheDocument();
    });

    it('shows Clear and Submit buttons', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letters = TILES;
      state.round.durationMs = 120000;

      render(<NineDashGame {...createDefaultProps(state)} />);

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('shows backspace button', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letters = TILES;
      state.round.durationMs = 120000;

      render(<NineDashGame {...createDefaultProps(state)} />);

      expect(screen.getByRole('button', { name: /backspace/i })).toBeInTheDocument();
    });

    it('appends letter to input when tile is clicked', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letters = TILES;
      state.round.durationMs = 120000;

      render(<NineDashGame {...createDefaultProps(state)} />);

      fireEvent.click(screen.getByText('T'));
      fireEvent.click(screen.getByText('R'));

      const input = screen.getByPlaceholderText(/tap letters to make a word/i);
      expect(input).toHaveValue('TR');
    });

    it('does not append a letter when the same tile is clicked twice', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letters = TILES;
      state.round.durationMs = 120000;

      render(<NineDashGame {...createDefaultProps(state)} />);

      fireEvent.click(screen.getByText('T'));
      fireEvent.click(screen.getByText('T'));

      const input = screen.getByPlaceholderText(/tap letters to make a word/i);
      expect(input).toHaveValue('T');
    });

    it('highlights selected tiles', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letters = TILES;
      state.round.durationMs = 120000;

      render(<NineDashGame {...createDefaultProps(state)} />);

      fireEvent.click(screen.getByText('T'));

      const tile = screen.getByText('T').closest('[role="gridcell"]');
      expect(tile).toHaveClass('letter-grid-tile-selected');
    });

    it('removes last letter when backspace is clicked', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letters = TILES;
      state.round.durationMs = 120000;

      render(<NineDashGame {...createDefaultProps(state)} />);

      fireEvent.click(screen.getByText('T'));
      fireEvent.click(screen.getByText('R'));
      fireEvent.click(screen.getByRole('button', { name: /backspace/i }));

      const input = screen.getByPlaceholderText(/tap letters to make a word/i);
      expect(input).toHaveValue('T');
    });

    it('clears input when Clear is clicked', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letters = TILES;
      state.round.durationMs = 120000;

      render(<NineDashGame {...createDefaultProps(state)} />);

      fireEvent.click(screen.getByText('T'));
      fireEvent.click(screen.getByText('R'));
      fireEvent.click(screen.getByText('I'));
      fireEvent.click(screen.getByRole('button', { name: /clear/i }));

      const input = screen.getByPlaceholderText(/tap letters to make a word/i);
      expect(input).toHaveValue('');
    });

    it('shows error when submitting with empty input', async () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letters = TILES;
      state.round.durationMs = 120000;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      render(<NineDashGame {...createDefaultProps(state)} />);

      fireEvent.submit(screen.getByRole('button', { name: /submit/i }));

      expect(await screen.findByText(/select some letters first/i)).toBeInTheDocument();
    });

    it('shows hint message when input is clicked', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letters = TILES;
      state.round.durationMs = 120000;

      render(<NineDashGame {...createDefaultProps(state)} />);

      fireEvent.click(screen.getByPlaceholderText(/tap letters to make a word/i));

      expect(screen.getByText(/tap the letters in the grid/i)).toBeInTheDocument();
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
    it('renders the winner message, final scores and the player results', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.letters = TILES;
      state.round.winnerIds = ['player-1'];
      state.round.winnerNames = ['Alice'];
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

      expect(screen.getByText('You won! 🎉')).toBeInTheDocument();
      expect(screen.getByText('Final Scores')).toBeInTheDocument();
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

  describe('win celebration', () => {
    it('plays the win celebration when the round transitions to results', () => {
      const state = createBaseState();
      state.round.state = 'active';
      state.round.letters = TILES;
      state.round.durationMs = 60000;
      state.round.startedAt = Date.now();
      state.round.endsAt = Date.now() + 60000;

      const { rerender } = render(<NineDashGame {...createDefaultProps(state)} />);

      state.round.state = 'results';
      state.round.letters = TILES;
      state.round.winnerIds = ['player-1'];
      state.round.winnerNames = ['Alice'];
      state.round.resultsByPlayer = {};

      rerender(<NineDashGame {...createDefaultProps(state)} />);

      expect(playWinSound).toHaveBeenCalledTimes(1);
    });

    it('does not replay the win celebration when the game view remounts while results are showing', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.letters = TILES;
      state.round.winnerIds = ['player-1'];
      state.round.winnerNames = ['Alice'];
      state.round.resultsByPlayer = {};

      const props = createDefaultProps(state);
      const { unmount } = render(<NineDashGame {...props} />);
      unmount();
      render(<NineDashGame {...props} />);

      expect(playWinSound).not.toHaveBeenCalled();
    });
  });
});
