import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import confetti from 'canvas-confetti';
import { LastWordStandingGame } from '../LastWordStandingGame';
import type { LastWordStandingState } from '@lancade/shared';

// Mock fetch globally to prevent API calls
vi.stubGlobal('fetch', vi.fn());

// Mock sound functions to prevent AudioContext access in tests
vi.mock('../../shared/utils/sounds', () => ({
  playOkaySound: vi.fn(),
  playWarningSound: vi.fn(),
  playWinSound: vi.fn(),
  warmupAudio: vi.fn(),
  playTickSound: vi.fn(),
  playPopSound: vi.fn(),
}));

import { playWinSound } from '../../shared/utils/sounds';

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
      scores: {},
      winnerId: null,
      winnerIds: [],
      winnerNames: [],
      lastRevival: null,
      revivalReadyPlayerIds: [],
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

    it('clears the word input when the turn passes to another player', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'A';
      state.match.currentPlayerId = 'player-1';
      state.match.turnEndsAt = Date.now() + 10000;

      const props = createDefaultProps(state);
      const { rerender } = render(<LastWordStandingGame {...props} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Apple' } });
      expect((input as HTMLInputElement).value).toBe('Apple');

      // The turn times out and passes to the next player (same match.id)
      state.match.currentPlayerId = 'player-2';
      state.match.turnEndsAt = Date.now() + 10000;

      rerender(<LastWordStandingGame {...props} />);
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

      // The turn cycles back to this player — the old input must not be pre-filled
      state.match.currentPlayerId = 'player-1';
      state.match.turnEndsAt = Date.now() + 10000;

      rerender(<LastWordStandingGame {...props} />);

      const nextInput = screen.getByRole('textbox');
      expect((nextInput as HTMLInputElement).value).toBe('');
    });

    it('clears the word input when a new match starts', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'A';
      state.match.currentPlayerId = 'player-1';
      state.match.turnEndsAt = Date.now() + 10000;

      const props = createDefaultProps(state);
      const { rerender } = render(<LastWordStandingGame {...props} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Apple' } });

      // The match ends and a new one begins (new match id)
      state.match.id = 2;
      state.match.state = 'idle';
      state.match.currentLetter = null;
      state.match.currentPlayerId = null;
      state.match.turnEndsAt = null;

      rerender(<LastWordStandingGame {...props} />);

      state.match.state = 'active';
      state.match.currentLetter = 'B';
      state.match.currentPlayerId = 'player-1';
      state.match.turnEndsAt = Date.now() + 10000;

      rerender(<LastWordStandingGame {...props} />);

      const nextInput = screen.getByRole('textbox');
      expect((nextInput as HTMLInputElement).value).toBe('');
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

    it('renders live scoreboard with all players', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'D';
      state.match.currentPlayerId = 'player-1';
      state.match.turnEndsAt = Date.now() + 10000;
      state.match.scores = { 'player-1': 2, 'player-2': 1, 'player-3': 1 };

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Live Scores')).toBeInTheDocument();
      expect(screen.getAllByText(/Alice/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Bob/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Charlie/).length).toBeGreaterThanOrEqual(1);
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

    it('shows that an eliminated player could come back', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'F';
      state.match.currentPlayerId = 'player-2';
      state.match.eliminatedPlayerIds = ['player-1'];
      state.match.turnEndsAt = Date.now() + 10000;

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/You're out for now/)).toBeInTheDocument();
    });

    it('shows permanent elimination message when the top score has moved on', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'F';
      state.match.currentPlayerId = 'player-2';
      state.match.eliminatedPlayerIds = ['player-1'];
      state.match.scores = { 'player-1': 2, 'player-2': 3, 'player-3': 3 };
      state.match.turnEndsAt = Date.now() + 10000;

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/You've been eliminated\. Watching the rest of the game/)).toBeInTheDocument();
      expect(screen.queryByText(/You're out for now/)).not.toBeInTheDocument();
    });
  });

  describe('revival ready phase', () => {
    it('shows a ready button to revived players who have not readied', () => {
      const state = createBaseState();
      state.match.state = 'revival-ready';
      state.match.activePlayerIds = ['player-1', 'player-3'];
      state.match.lastRevival = {
        id: 1,
        wordNumber: 5,
        revivedPlayerIds: ['player-1', 'player-3'],
      };
      state.match.revivalReadyPlayerIds = [];

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Everyone failed to get their 5th word/)).toBeInTheDocument();
      expect(screen.getByText(/You're back in!/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ready/i })).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('shows a waiting message to revived players who have readied', () => {
      const state = createBaseState();
      state.match.state = 'revival-ready';
      state.match.activePlayerIds = ['player-1', 'player-3'];
      state.match.lastRevival = {
        id: 2,
        wordNumber: 5,
        revivedPlayerIds: ['player-1', 'player-3'],
      };
      state.match.revivalReadyPlayerIds = ['player-1'];

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Waiting for other players to be ready... \(1\/2\)/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /ready/i })).not.toBeInTheDocument();
    });

    it('shows the waiting message to non-revived players without a ready button', () => {
      const state = createBaseState();
      state.match.state = 'revival-ready';
      state.match.activePlayerIds = ['player-1', 'player-2'];
      state.match.lastRevival = {
        id: 3,
        wordNumber: 3,
        revivedPlayerIds: ['player-1', 'player-2'],
      };
      state.match.revivalReadyPlayerIds = ['player-1'];

      const props = createDefaultProps(state);
      props.playerId = 'player-3';

      render(<LastWordStandingGame {...props} />);

      expect(screen.getByText(/Everyone failed to get their 3rd word/)).toBeInTheDocument();
      expect(screen.getByText(/Waiting for players to be ready... \(1\/2\)/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /ready/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/You're back in!/)).not.toBeInTheDocument();
    });

    it('submits the READY command when the ready button is clicked', async () => {
      const state = createBaseState();
      state.match.state = 'revival-ready';
      state.match.activePlayerIds = ['player-1', 'player-3'];
      state.match.lastRevival = {
        id: 4,
        wordNumber: 5,
        revivedPlayerIds: ['player-1', 'player-3'],
      };
      state.match.revivalReadyPlayerIds = [];

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });
      vi.stubGlobal('fetch', fetchMock);

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      fireEvent.click(screen.getByRole('button', { name: /ready/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.playerId).toBe('player-1');
      expect(body.word).toBe('READY');
      expect(body.key).toBe('KEY123');
    });

    it('does not show the ready panel when there was no revival', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.currentLetter = 'A';
      state.match.currentPlayerId = 'player-1';
      state.match.turnEndsAt = Date.now() + 10000;

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      expect(screen.queryByText(/Everyone failed/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /ready/i })).not.toBeInTheDocument();
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
    it('shows winner message and final scores', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-2';
      state.match.winnerIds = ['player-2'];
      state.match.winnerNames = ['Bob'];
      state.match.eliminatedPlayerIds = ['player-1', 'player-3'];
      state.match.scores = { 'player-1': 3, 'player-2': 4, 'player-3': 2 };

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      // Winner message and final scoreboard replace the old podium
      expect(screen.getByText(/Bob wins/)).toBeInTheDocument();
      expect(screen.getByText('Final Scores')).toBeInTheDocument();
      expect(screen.queryByText(/Podium/i)).not.toBeInTheDocument();
    });

    it('renders final scoreboard with all match players', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-1';
      state.match.winnerIds = ['player-1'];
      state.match.winnerNames = ['Alice'];
      state.match.scores = { 'player-1': 2, 'player-2': 1, 'player-3': 1 };

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      // Players appear in the final scoreboard
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/Bob/)).toBeInTheDocument();
      expect(screen.getByText(/Charlie/)).toBeInTheDocument();
    });

    it('plays win sound and confetti when current player wins', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-1';
      state.match.winnerIds = ['player-1'];
      state.match.winnerNames = ['Alice'];

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/You won/)).toBeInTheDocument();
      expect(playWinSound).toHaveBeenCalledTimes(1);
      expect(confetti).toHaveBeenCalled();
    });

    it('does not play win sound when another player wins', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-2';
      state.match.winnerIds = ['player-2'];
      state.match.winnerNames = ['Bob'];

      render(<LastWordStandingGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Bob wins/)).toBeInTheDocument();
      expect(playWinSound).not.toHaveBeenCalled();
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

    it('only shows match participants in live scoreboard', () => {
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

      // player-1 (Alice) is NOT in match.order — should not appear in the scoreboard
      expect(screen.queryByText(/Alice/)).not.toBeInTheDocument();
      // player-2 and player-3 ARE in match.order — should appear
      expect(screen.getAllByText(/Bob/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Charlie/).length).toBeGreaterThanOrEqual(1);
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
