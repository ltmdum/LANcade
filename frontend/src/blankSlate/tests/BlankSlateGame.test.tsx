import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlankSlateGame } from '../BlankSlateGame';
import type { BlankSlateState } from '@lancade/shared';

// Mock fetch globally to prevent API calls
vi.stubGlobal('fetch', vi.fn());

/**
 * Create a base server state for testing.
 */
function createBaseState(): BlankSlateState {
  return {
    serverTime: Date.now(),
    players: [
      { id: 'player-1', name: 'Alice' },
      { id: 'player-2', name: 'Bob' },
      { id: 'player-3', name: 'Charlie' },
    ],
    settings: {
      categories: [],
      selectedCategory: '',
    },
    round: {
      id: 0,
      state: 'idle',
      prompt: null,
      submissions: [],
      submittedPlayerIds: [],
      durationMs: null,
      startedAt: null,
      endsAt: null,
      claimableTargets: {},
      claims: [],
      currentClaimIndex: 0,
      result: null,
    },
    scores: { 'player-1': 5, 'player-2': 3, 'player-3': 0 },
    winnerId: null,
    winnerName: null,
    game: { id: 'blankslate', name: 'BlankSlate' },
    games: [{ id: 'blankslate', name: 'BlankSlate' }],
  };
}

/**
 * Default props for the game component.
 */
function createDefaultProps(serverState: BlankSlateState) {
  return {
    serverState,
    connection: 'connected' as const,
    playerId: 'player-1',
    playerName: 'Alice',
    playerPassword: 'password123',
    adminSessionId: '',
    isAdmin: false,
    setShowConfig: vi.fn(),
  };
}

describe('BlankSlateGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('idle state', () => {
    it('renders nothing when round is idle and no winner', () => {
      const state = createBaseState();
      state.round.state = 'idle';

      const { container } = render(
        <BlankSlateGame {...createDefaultProps(state)} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('submitting state', () => {
    it('renders the prompt display', () => {
      const state = createBaseState();
      state.round.state = 'submitting';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };

      render(<BlankSlateGame {...createDefaultProps(state)} />);

      expect(screen.getByText('body')).toBeInTheDocument();
    });

    it('renders the submit panel', () => {
      const state = createBaseState();
      state.round.state = 'submitting';
      state.round.prompt = { id: 1, text: 'house', blankPosition: 'after' };

      render(<BlankSlateGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Your Answer')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('shows submitted word when player has submitted', () => {
      const state = createBaseState();
      state.round.state = 'submitting';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.round.submittedPlayerIds = ['player-1'];
      state.round.submissions = [
        { playerId: 'player-1', playerName: 'Alice', word: 'upper' },
      ];

      render(<BlankSlateGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/upper/)).toBeInTheDocument();
    });
  });

  describe('claiming state', () => {
    it('renders claim panel for players with claimable targets', () => {
      const state = createBaseState();
      state.round.state = 'claiming';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.round.submissions = [
        { playerId: 'player-1', playerName: 'Alice', word: 'sane' },
        { playerId: 'player-2', playerName: 'Bob', word: 'same' },
        { playerId: 'player-3', playerName: 'Charlie', word: 'same' },
      ];
      state.round.claimableTargets = {
        'player-1': ['same'],
      };

      render(<BlankSlateGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Make a Claim/)).toBeInTheDocument();
    });

    it('shows claim buttons only for similar words', () => {
      const state = createBaseState();
      state.round.state = 'claiming';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.round.submissions = [
        { playerId: 'player-1', playerName: 'Alice', word: 'sane' },
        { playerId: 'player-2', playerName: 'Bob', word: 'same' },
        { playerId: 'player-3', playerName: 'Charlie', word: 'same' },
      ];
      state.round.claimableTargets = {
        'player-1': ['same'],
      };

      render(<BlankSlateGame {...createDefaultProps(state)} />);

      expect(screen.getByRole('button', { name: /Claim "same"/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Skip/i })).toBeInTheDocument();
    });

    it('shows waiting message for players without claimable targets', () => {
      const state = createBaseState();
      state.round.state = 'claiming';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.round.submissions = [
        { playerId: 'player-1', playerName: 'Alice', word: 'same' },
        { playerId: 'player-2', playerName: 'Bob', word: 'same' },
        { playerId: 'player-3', playerName: 'Charlie', word: 'sane' },
      ];
      state.round.claimableTargets = {
        'player-3': ['same'],
      };

      render(<BlankSlateGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Waiting for players with unique words/)).toBeInTheDocument();
    });

    it('shows waiting message for players with unique words but no similar targets', () => {
      const state = createBaseState();
      state.round.state = 'claiming';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.round.submissions = [
        { playerId: 'player-1', playerName: 'Alice', word: 'zebra' },
        { playerId: 'player-2', playerName: 'Bob', word: 'same' },
        { playerId: 'player-3', playerName: 'Charlie', word: 'same' },
      ];
      // Player-1 has unique word but no similar targets
      state.round.claimableTargets = {};

      render(<BlankSlateGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Waiting for players with unique words/)).toBeInTheDocument();
    });
  });

  describe('voting state', () => {
    it('renders vote panel with current claim', () => {
      const state = createBaseState();
      state.round.state = 'voting';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.round.claims = [
        {
          claimantId: 'player-3',
          claimantName: 'Charlie',
          claimantWord: 'sane',
          targetWord: 'same',
          targetPlayerIds: ['player-1', 'player-2'],
          votes: {},
          resolved: false,
          accepted: false,
          isMutual: false,
        },
      ];
      state.round.currentClaimIndex = 0;

      render(<BlankSlateGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Vote on Claim/)).toBeInTheDocument();
      expect(screen.getAllByText(/Charlie/).length).toBeGreaterThanOrEqual(1);
    });

    it('renders accept and reject buttons for eligible voters', () => {
      const state = createBaseState();
      state.round.state = 'voting';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.round.claims = [
        {
          claimantId: 'player-3',
          claimantName: 'Charlie',
          claimantWord: 'sane',
          targetWord: 'same',
          targetPlayerIds: ['player-1', 'player-2'],
          votes: {},
          resolved: false,
          accepted: false,
          isMutual: false,
        },
      ];
      state.round.currentClaimIndex = 0;

      render(<BlankSlateGame {...createDefaultProps(state)} />);

      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    it('shows waiting message for mutual claim participants', () => {
      const state = createBaseState();
      state.round.state = 'voting';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.round.claims = [
        {
          claimantId: 'player-2',
          claimantName: 'Bob',
          claimantWord: 'car',
          targetWord: 'cat',
          targetPlayerIds: ['player-1'],
          votes: {},
          resolved: false,
          accepted: false,
          isMutual: true,
        },
      ];
      state.round.currentClaimIndex = 0;

      render(<BlankSlateGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/You both claimed each other's words/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    });

    it('shows waiting message for claimant on non-mutual claim', () => {
      const state = createBaseState();
      state.round.state = 'voting';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.round.claims = [
        {
          claimantId: 'player-1',
          claimantName: 'Alice',
          claimantWord: 'sane',
          targetWord: 'same',
          targetPlayerIds: ['player-2', 'player-3'],
          votes: {},
          resolved: false,
          accepted: false,
          isMutual: false,
        },
      ];
      state.round.currentClaimIndex = 0;

      render(<BlankSlateGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Waiting for others to vote/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    });
  });

  describe('results state', () => {
    it('renders results panel with score changes', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.round.result = {
        groups: [
          {
            word: 'same',
            playerIds: ['player-1', 'player-2'],
            playerNames: ['Alice', 'Bob'],
            points: 3,
          },
          {
            word: 'unique',
            playerIds: ['player-3'],
            playerNames: ['Charlie'],
            points: 0,
          },
        ],
        scoreChanges: { 'player-1': 3, 'player-2': 3, 'player-3': 0 },
      };
      state.round.durationMs = 30000;

      render(<BlankSlateGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Round Results/)).toBeInTheDocument();
      expect(screen.getByText(/"same"/)).toBeInTheDocument();
      expect(screen.getByText(/\+3 each/)).toBeInTheDocument();
    });

    it('renders admin controls in results state for admin', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.round.durationMs = 30000;
      state.round.result = {
        groups: [],
        scoreChanges: {},
      };

      const props = createDefaultProps(state);
      props.isAdmin = true;
      props.adminSessionId = 'admin-123';

      render(<BlankSlateGame {...props} />);

      expect(screen.getByRole('button', { name: /next round/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to config/i })).toBeInTheDocument();
    });
  });

  describe('admin non-player', () => {
    it('admin non-player sees controls in results state', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.round.durationMs = 30000;
      state.round.result = {
        groups: [],
        scoreChanges: {},
      };

      const props = createDefaultProps(state);
      props.playerId = '';
      props.playerName = '';
      props.isAdmin = true;
      props.adminSessionId = 'admin-123';

      render(<BlankSlateGame {...props} />);

      expect(screen.getByRole('button', { name: /next round/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to config/i })).toBeInTheDocument();
      expect(screen.queryByText(/Round Results/)).not.toBeInTheDocument();
    });

    it('admin non-player renders nothing during submitting state', () => {
      const state = createBaseState();
      state.round.state = 'submitting';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };

      const props = createDefaultProps(state);
      props.playerId = '';
      props.playerName = '';
      props.isAdmin = true;
      props.adminSessionId = 'admin-123';

      const { container } = render(<BlankSlateGame {...props} />);

      expect(container.firstChild).toBeNull();
    });

    it('admin with stale playerId renders nothing during submitting state', () => {
      const state = createBaseState();
      state.round.state = 'submitting';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };

      const props = createDefaultProps(state);
      props.playerId = 'stale-id';
      props.playerName = 'Stale';
      props.isAdmin = true;
      props.adminSessionId = 'admin-123';

      const { container } = render(<BlankSlateGame {...props} />);

      expect(container.firstChild).toBeNull();
    });

    it('admin with stale playerId sees controls in results state', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.round.durationMs = 30000;
      state.round.result = {
        groups: [],
        scoreChanges: {},
      };

      const props = createDefaultProps(state);
      props.playerId = 'stale-id';
      props.playerName = 'Stale';
      props.isAdmin = true;
      props.adminSessionId = 'admin-123';

      render(<BlankSlateGame {...props} />);

      expect(screen.getByRole('button', { name: /next round/i })).toBeInTheDocument();
      expect(screen.queryByText(/Round Results/)).not.toBeInTheDocument();
    });
  });

  describe('winner state', () => {
    it('renders winner display', () => {
      const state = createBaseState();
      state.winnerId = 'player-1';
      state.winnerName = 'Alice';
      state.scores = { 'player-1': 25, 'player-2': 20, 'player-3': 15 };

      render(<BlankSlateGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Game Over/)).toBeInTheDocument();
      expect(screen.getByText(/Alice wins!/)).toBeInTheDocument();
    });

    it('renders admin controls for new game when there is a winner', () => {
      const state = createBaseState();
      state.winnerId = 'player-1';
      state.winnerName = 'Alice';
      state.round.durationMs = 30000;

      const props = createDefaultProps(state);
      props.isAdmin = true;
      props.adminSessionId = 'admin-123';

      render(<BlankSlateGame {...props} />);

      expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
    });
  });

  describe('scoreboard', () => {
    it('renders scoreboard with current scores', () => {
      const state = createBaseState();
      state.round.state = 'submitting';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.scores = { 'player-1': 10, 'player-2': 5, 'player-3': 3 };

      render(<BlankSlateGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Scores')).toBeInTheDocument();
      expect(screen.getByText(/Alice: 10/)).toBeInTheDocument();
      expect(screen.getByText(/Bob: 5/)).toBeInTheDocument();
      expect(screen.getByText(/Charlie: 3/)).toBeInTheDocument();
    });
  });
});
