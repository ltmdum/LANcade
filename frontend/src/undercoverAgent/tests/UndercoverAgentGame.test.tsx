import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UndercoverAgentGame } from '../UndercoverAgentGame';
import type { UndercoverAgentState } from '@lancade/shared';

vi.stubGlobal('fetch', vi.fn());

vi.mock('../../shared/utils/sounds', () => ({
  playOkaySound: vi.fn(),
  playWarningSound: vi.fn(),
  warmupAudio: vi.fn(),
}));

function createBaseState(): UndercoverAgentState {
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
    match: {
      id: 0,
      state: 'idle',
      word: null,
      undercoverPlayerId: null,
      revealedPlayerIds: [],
      readyPlayerIds: [],
      turnOrder: [],
      currentTurnIndex: 0,
      currentTurnPlayerId: null,
      submissions: [],
      usedWords: [],
      roundSubmittedPlayerIds: [],
      discussionReadyPlayerIds: [],
      voteRounds: [],
      currentVoteRound: 0,
      votedPlayerIds: [],
      winnerIsUndercover: false,
      finishReason: null,
      finalGuess: null,
      participants: ['player-1', 'player-2', 'player-3'],
      scores: {},
      roundPoints: {},
      winnerIds: [],
      winnerNames: [],
      winningScore: 5,
    },
    gameSettings: { winningScore: 5 },
    game: { id: 'undercoveragent', name: 'Undercover Agent' },
    games: [{ id: 'undercoveragent', name: 'Undercover Agent' }],
  };
}

function createDefaultProps(serverState: UndercoverAgentState) {
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

describe('UndercoverAgentGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('idle state', () => {
    it('renders scoreboard when idle with scores', () => {
      const state = createBaseState();
      state.match.state = 'idle';
      state.match.scores = { 'player-1': 2, 'player-2': 0, 'player-3': 0 };
      state.match.finishReason = 'wrong_vote';

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/target: 5/i)).toBeInTheDocument();
    });
  });

  describe('reveal state', () => {
    it('shows reveal button when player has not revealed', () => {
      const state = createBaseState();
      state.match.state = 'reveal';
      state.match.word = 'secret';
      state.match.revealedPlayerIds = [];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Your Role')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /reveal your role/i })
      ).toBeInTheDocument();
    });

    it('shows civilian role info after revealing', () => {
      const state = createBaseState();
      state.match.state = 'reveal';
      state.match.word = 'banana';
      state.match.revealedPlayerIds = ['player-1'];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(
        screen.queryByRole('button', { name: /reveal your role/i })
      ).not.toBeInTheDocument();
    });

    it('shows ready button after reveal', () => {
      const state = createBaseState();
      state.match.state = 'reveal';
      state.match.word = 'banana';
      state.match.revealedPlayerIds = ['player-1'];
      state.match.readyPlayerIds = [];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(
        screen.getByRole('button', { name: /ready/i })
      ).toBeInTheDocument();
    });

    it('shows waiting message when player has readied', () => {
      const state = createBaseState();
      state.match.state = 'reveal';
      state.match.word = 'banana';
      state.match.revealedPlayerIds = ['player-1'];
      state.match.readyPlayerIds = ['player-1'];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/waiting for other players/i)
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /^ready$/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('submitting state', () => {
    it('shows word input when it is the player turn', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.currentTurnPlayerId = 'player-1';
      state.match.turnOrder = ['player-1', 'player-2', 'player-3'];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/it's your turn/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/your clue word/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /submit/i })
      ).toBeInTheDocument();
    });

    it('shows waiting message when it is not the player turn', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.currentTurnPlayerId = 'player-2';
      state.match.turnOrder = ['player-2', 'player-1', 'player-3'];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/waiting for/i)).toBeInTheDocument();
      expect(screen.getByText(/Bob/)).toBeInTheDocument();
    });

    it('shows submitted message when player already submitted this round', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.currentTurnPlayerId = 'player-2';
      state.match.roundSubmittedPlayerIds = ['player-1'];
      state.match.turnOrder = ['player-1', 'player-2', 'player-3'];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/you have submitted your clue this round/i)
      ).toBeInTheDocument();
    });

    it('shows word list with submissions', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.currentTurnPlayerId = 'player-2';
      state.match.turnOrder = ['player-1', 'player-2', 'player-3'];
      state.match.submissions = [
        { playerId: 'player-1', playerName: 'Alice', words: ['apple'] },
      ];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('apple')).toBeInTheDocument();
    });
  });

  describe('discussion state', () => {
    it('shows discussion prompt', () => {
      const state = createBaseState();
      state.match.state = 'discussion';
      state.match.discussionReadyPlayerIds = [];
      state.match.submissions = [
        { playerId: 'player-1', playerName: 'Alice', words: ['apple'] },
        { playerId: 'player-2', playerName: 'Bob', words: ['boat'] },
        { playerId: 'player-3', playerName: 'Charlie', words: ['car'] },
      ];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/Discuss who you think the Undercover Agent is!/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /ready to vote/i })
      ).toBeInTheDocument();
    });
  });

  describe('voting state', () => {
    it('shows vote options excluding self', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentVoteRound = 1;
      state.match.votedPlayerIds = [];
      state.match.submissions = [
        { playerId: 'player-1', playerName: 'Alice', words: ['apple'] },
        { playerId: 'player-2', playerName: 'Bob', words: ['boat'] },
        { playerId: 'player-3', playerName: 'Charlie', words: ['car'] },
      ];
      state.match.voteRounds = [];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/who do you think is the undercover agent/i)
      ).toBeInTheDocument();
      const voteButtons = screen.getAllByRole('button').filter(
        (btn) => btn.classList.contains('undercover-vote-card')
      );
      expect(voteButtons.length).toBe(2);
      expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Charlie').length).toBeGreaterThanOrEqual(1);
    });

    it('shows waiting message after voting', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentVoteRound = 1;
      state.match.votedPlayerIds = ['player-1'];
      state.match.submissions = [
        { playerId: 'player-1', playerName: 'Alice', words: ['apple'] },
        { playerId: 'player-2', playerName: 'Bob', words: ['boat'] },
        { playerId: 'player-3', playerName: 'Charlie', words: ['car'] },
      ];
      state.match.voteRounds = [];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/vote submitted.*waiting/i)
      ).toBeInTheDocument();
    });

    it('shows previous vote tallies with tie message', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentVoteRound = 2;
      state.match.votedPlayerIds = [];
      state.match.submissions = [
        { playerId: 'player-1', playerName: 'Alice', words: ['apple'] },
        { playerId: 'player-2', playerName: 'Bob', words: ['boat'] },
        { playerId: 'player-3', playerName: 'Charlie', words: ['car'] },
      ];
      state.match.voteRounds = [
        {
          tally: [
            { playerId: 'player-1', playerName: 'Alice', count: 1 },
            { playerId: 'player-2', playerName: 'Bob', count: 1 },
            { playerId: 'player-3', playerName: 'Charlie', count: 1 },
          ],
          votedPlayerIds: ['player-1', 'player-2', 'player-3'],
          isTie: true,
          targetPlayerId: null,
        },
      ];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Previous Votes for this Round')).toBeInTheDocument();
      expect(
        screen.getByText(/Tie! Another round of voting needed/i)
      ).toBeInTheDocument();
    });

    it('shows word list in voting phase', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentVoteRound = 1;
      state.match.votedPlayerIds = [];
      state.match.submissions = [
        {
          playerId: 'player-1',
          playerName: 'Alice',
          words: ['apple'],
        },
        {
          playerId: 'player-2',
          playerName: 'Bob',
          words: ['boat'],
        },
      ];
      state.match.voteRounds = [];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('apple')).toBeInTheDocument();
      expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('boat')).toBeInTheDocument();
    });
  });

  describe('finished state', () => {
    it('shows who was the undercover agent', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.undercoverPlayerId = 'player-2';
      state.match.winnerIsUndercover = false;
      state.match.word = 'banana';
      state.match.submissions = [
        { playerId: 'player-1', playerName: 'Alice', words: ['fruit'] },
        { playerId: 'player-2', playerName: 'Bob', words: ['yellow'] },
        { playerId: 'player-3', playerName: 'Charlie', words: ['peel'] },
      ];
      state.match.finishReason = 'wrong_vote';

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/The Undercover Agent was/)).toBeInTheDocument();
      expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
    });

    it('shows round result message', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.undercoverPlayerId = 'player-2';
      state.match.winnerIsUndercover = false;
      state.match.finishReason = 'agent_final_guess_wrong';
      state.match.word = 'banana';
      state.match.submissions = [];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/Civilians who voted for the Agent earn 2 points/i)
      ).toBeInTheDocument();
    });

    it('shows winner text when there are winners', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.undercoverPlayerId = 'player-2';
      state.match.winnerIsUndercover = false;
      state.match.word = 'banana';
      state.match.winnerIds = ['player-1'];
      state.match.winnerNames = ['Alice'];
      state.match.submissions = [];
      state.match.finishReason = 'wrong_vote';

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Alice wins the game!/)).toBeInTheDocument();
    });

    it('shows the secret word', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.undercoverPlayerId = 'player-2';
      state.match.winnerIsUndercover = false;
      state.match.word = 'banana';
      state.match.submissions = [];
      state.match.finishReason = 'wrong_vote';

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/The secret word was/)).toBeInTheDocument();
      expect(screen.getByText('banana')).toBeInTheDocument();
    });

    it('admin sees play again controls in finished state', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.undercoverPlayerId = 'player-2';
      state.match.winnerIsUndercover = false;
      state.match.word = 'banana';
      state.match.submissions = [];
      state.match.winnerIds = ['player-1'];
      state.match.winnerNames = ['Alice'];

      const props = createDefaultProps(state);
      props.isAdmin = true;
      props.accessKey = 'admin-123';

      render(<UndercoverAgentGame {...props} />);

      expect(
        screen.getByRole('button', { name: /new game/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /back to configuration/i })
      ).toBeInTheDocument();
    });
  });

  describe('guessing state', () => {
    it('shows guess form when player is the undercover agent', () => {
      const state = createBaseState();
      state.match.state = 'guessing';
      state.match.undercoverPlayerId = 'player-1';
      state.match.submissions = [
        { playerId: 'player-1', playerName: 'Alice', words: ['clue1'] },
        { playerId: 'player-2', playerName: 'Bob', words: ['clue2'] },
        { playerId: 'player-3', playerName: 'Charlie', words: ['clue3'] },
      ];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/you have been identified/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/guess the secret word/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /submit guess/i })
      ).toBeInTheDocument();
    });

    it('shows waiting message when player is a civilian', () => {
      const state = createBaseState();
      state.match.state = 'guessing';
      state.match.undercoverPlayerId = 'player-2';
      state.match.submissions = [
        { playerId: 'player-1', playerName: 'Alice', words: ['clue1'] },
        { playerId: 'player-2', playerName: 'Bob', words: ['clue2'] },
        { playerId: 'player-3', playerName: 'Charlie', words: ['clue3'] },
      ];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/has been identified as the undercover agent/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/one final chance to guess the secret word/i)
      ).toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText(/guess the secret word/i)
      ).not.toBeInTheDocument();
    });

    it('shows word list during guessing phase', () => {
      const state = createBaseState();
      state.match.state = 'guessing';
      state.match.undercoverPlayerId = 'player-2';
      state.match.submissions = [
        { playerId: 'player-1', playerName: 'Alice', words: ['apple'] },
        { playerId: 'player-2', playerName: 'Bob', words: ['boat'] },
      ];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText('apple')).toBeInTheDocument();
      expect(screen.getByText('boat')).toBeInTheDocument();
    });
  });

  describe('non-participating admin', () => {
    it('shows play again panel in finished state', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.undercoverPlayerId = 'player-2';
      state.match.winnerIsUndercover = false;
      state.match.word = 'banana';
      state.match.submissions = [];
      state.match.winnerIds = ['player-1'];
      state.match.winnerNames = ['Alice'];

      const props = createDefaultProps(state);
      props.playerId = 'non-player-admin';
      props.playerName = 'Admin';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<UndercoverAgentGame {...props} />);

      expect(
        screen.getByRole('button', { name: /new game/i })
      ).toBeInTheDocument();
      expect(screen.getAllByText('Game Over').length).toBeGreaterThanOrEqual(1);
    });

    it('does not render role reveal panel during reveal', () => {
      const state = createBaseState();
      state.match.state = 'reveal';
      state.match.word = 'secret';

      const props = createDefaultProps(state);
      props.playerId = 'non-player-admin';
      props.playerName = 'Admin';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<UndercoverAgentGame {...props} />);

      expect(screen.queryByText('Your Role')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /reveal your role/i })
      ).not.toBeInTheDocument();
    });

    it('does not render submit panel during submitting', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.currentTurnPlayerId = 'player-1';
      state.match.turnOrder = ['player-1', 'player-2', 'player-3'];

      const props = createDefaultProps(state);
      props.playerId = 'non-player-admin';
      props.playerName = 'Admin';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<UndercoverAgentGame {...props} />);

      expect(
        screen.queryByPlaceholderText(/your clue word/i)
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/it's your turn/i)).not.toBeInTheDocument();
    });

    it('does not render vote panel during voting', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentVoteRound = 1;
      state.match.votedPlayerIds = [];
      state.match.participants = ['player-1', 'player-2', 'player-3'];
      state.match.submissions = [];
      state.match.voteRounds = [];

      const props = createDefaultProps(state);
      props.playerId = 'non-player-admin';
      props.playerName = 'Admin';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<UndercoverAgentGame {...props} />);

      expect(
        screen.queryByText(/who do you think is the undercover agent/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('discussion phase non-participating', () => {
    it('does not render discussion panel for non-participating admin', () => {
      const state = createBaseState();
      state.match.state = 'discussion';

      const props = createDefaultProps(state);
      props.playerId = 'non-player-admin';
      props.isAdmin = true;
      props.isParticipating = false;

      render(<UndercoverAgentGame {...props} />);

      expect(
        screen.queryByText(/Discuss who you think/i)
      ).not.toBeInTheDocument();
    });
  });
});
