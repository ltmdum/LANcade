import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MindMatchGame } from '../MindMatchGame';
import type { MindMatchState } from '@lancade/shared';

// Mock fetch globally to prevent API calls
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

/**
 * Create a base server state for testing.
 */
function createBaseState(): MindMatchState {
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
    gameSettings: { winningScore: 25 },
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
    winnerIds: [],
    winnerNames: [],
    game: { id: 'mindmatch', name: 'Mind Match' },
    games: [{ id: 'mindmatch', name: 'Mind Match' }],
  };
}

/**
 * Default props for the game component.
 */
function createDefaultProps(serverState: MindMatchState) {
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

describe('MindMatchGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('idle state', () => {
    it('renders nothing when round is idle and no winner', () => {
      const state = createBaseState();
      state.round.state = 'idle';

      const { container } = render(
        <MindMatchGame {...createDefaultProps(state)} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('submitting state', () => {
    it('renders the prompt display', () => {
      const state = createBaseState();
      state.round.state = 'submitting';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };

      render(<MindMatchGame {...createDefaultProps(state)} />);

      expect(screen.getByText('body')).toBeInTheDocument();
    });

    it('renders the submit panel', () => {
      const state = createBaseState();
      state.round.state = 'submitting';
      state.round.prompt = { id: 1, text: 'house', blankPosition: 'after' };

      render(<MindMatchGame {...createDefaultProps(state)} />);

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

      render(<MindMatchGame {...createDefaultProps(state)} />);

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

      render(<MindMatchGame {...createDefaultProps(state)} />);

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

      render(<MindMatchGame {...createDefaultProps(state)} />);

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

      render(<MindMatchGame {...createDefaultProps(state)} />);

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

      render(<MindMatchGame {...createDefaultProps(state)} />);

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

      render(<MindMatchGame {...createDefaultProps(state)} />);

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

      render(<MindMatchGame {...createDefaultProps(state)} />);

      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    it('does not reveal target player names in claim description', () => {
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

      render(<MindMatchGame {...createDefaultProps(state)} />);

      // Should show claimant word and target word
      expect(screen.getByText(/sane/)).toBeInTheDocument();
      expect(screen.getByText(/same/)).toBeInTheDocument();
      // Should NOT show "(submitted by ...)"
      expect(screen.queryByText(/submitted by/i)).not.toBeInTheDocument();
    });

    it('does not show mutual claim info to voters', () => {
      const state = createBaseState();
      state.round.state = 'voting';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.round.claims = [
        {
          claimantId: 'player-3',
          claimantName: 'Charlie',
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

      render(<MindMatchGame {...createDefaultProps(state)} />);

      // Should NOT reveal mutual claim info
      expect(screen.queryByText(/both claimed/i)).not.toBeInTheDocument();
      // Should NOT reveal target player names
      expect(screen.queryByText(/submitted by/i)).not.toBeInTheDocument();
    });

    it('shows waiting message for mutual claim participants without revealing info', () => {
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
          votes: { 'player-2': 'accept' },
          resolved: false,
          accepted: false,
          isMutual: true,
        },
      ];
      state.round.currentClaimIndex = 0;

      const props = { ...createDefaultProps(state), playerId: 'player-2', playerName: 'Bob' };
      render(<MindMatchGame {...props} />);

      expect(screen.getByText(/vote submitted/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/both claimed/i)).not.toBeInTheDocument();
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
          votes: { 'player-1': 'accept' },
          resolved: false,
          accepted: false,
          isMutual: false,
        },
      ];
      state.round.currentClaimIndex = 0;

      render(<MindMatchGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/vote submitted/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    });
  });

  describe('results state', () => {
    it('renders results panel after round', () => {
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

      render(<MindMatchGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Round Results/)).toBeInTheDocument();
      expect(screen.getByText(/same/)).toBeInTheDocument();
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
      props.accessKey = 'admin-123';

      render(<MindMatchGame {...props} />);

      expect(screen.getByRole('button', { name: /next round/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /back to menu/i })).not.toBeInTheDocument();
    });
  });

  describe('non-participating admin', () => {
    it('sees controls in results state', () => {
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
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<MindMatchGame {...props} />);

      expect(screen.getByRole('button', { name: /next round/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /back to menu/i })).not.toBeInTheDocument();
    });

    it('does not render submit panel during submitting state', () => {
      const state = createBaseState();
      state.round.state = 'submitting';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };

      const props = createDefaultProps(state);
      props.playerId = '';
      props.playerName = '';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<MindMatchGame {...props} />);

      // Non-participating admin sees prompt + scoreboard but no submit form
      expect(screen.queryByText('Your Answer')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('admin with stale playerId does not render submit panel during submitting state', () => {
      const state = createBaseState();
      state.round.state = 'submitting';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };

      const props = createDefaultProps(state);
      props.playerId = 'stale-id';
      props.playerName = 'Stale';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<MindMatchGame {...props} />);

      expect(screen.queryByText('Your Answer')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
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
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<MindMatchGame {...props} />);

      expect(screen.getByRole('button', { name: /next round/i })).toBeInTheDocument();
    });
  });

  describe('winner state', () => {
    it('renders winner display', () => {
      const state = createBaseState();
      state.winnerIds = ['player-1'];
      state.winnerNames = ['Alice'];
      state.scores = { 'player-1': 25, 'player-2': 20, 'player-3': 15 };

      render(<MindMatchGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/You won!/)).toBeInTheDocument();
      expect(screen.getByText('Final Scores')).toBeInTheDocument();
    });

    it('renders admin controls for new game when there is a winner', () => {
      const state = createBaseState();
      state.winnerIds = ['player-1'];
      state.winnerNames = ['Alice'];
      state.round.durationMs = 30000;

      const props = createDefaultProps(state);
      props.isAdmin = true;
      props.accessKey = 'admin-123';

      render(<MindMatchGame {...props} />);

      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
    });
  });

  describe('scoreboard', () => {
    it('renders scoreboard with current scores', () => {
      const state = createBaseState();
      state.round.state = 'submitting';
      state.round.prompt = { id: 1, text: 'body', blankPosition: 'before' };
      state.scores = { 'player-1': 10, 'player-2': 5, 'player-3': 3 };

      render(<MindMatchGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Live Scores')).toBeInTheDocument();
      const scores = screen.getAllByText(/^\d+$/);
      expect(scores).toHaveLength(3);
      expect(scores[0]).toHaveTextContent('10');
      expect(scores[1]).toHaveTextContent('5');
      expect(scores[2]).toHaveTextContent('3');
    });
  });

  describe('win celebration', () => {
    it('plays the win celebration when the player becomes a winner', () => {
      const state = createBaseState();
      state.round.state = 'results';
      state.winnerIds = [];

      const { rerender } = render(<MindMatchGame {...createDefaultProps(state)} />);

      state.winnerIds = ['player-1'];
      state.winnerNames = ['Alice'];

      rerender(<MindMatchGame {...createDefaultProps(state)} />);

      expect(playWinSound).toHaveBeenCalledTimes(1);
    });

    it('does not replay the win celebration when the game view remounts while the player is a winner', () => {
      const state = createBaseState();
      state.winnerIds = ['player-1'];
      state.winnerNames = ['Alice'];

      const props = createDefaultProps(state);
      const { unmount } = render(<MindMatchGame {...props} />);
      unmount();
      render(<MindMatchGame {...props} />);

      expect(playWinSound).not.toHaveBeenCalled();
    });
  });
});
