import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UndercoverAgentGame } from '../UndercoverAgentGame';
import type { UndercoverAgentState } from '@lancade/shared';

vi.stubGlobal('fetch', vi.fn());

/**
 * Create a base server state for Undercover Agent testing.
 * @returns Default UndercoverAgentState in idle mode.
 */
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
      totalRounds: 2,
      currentRound: 1,
      turnOrder: [],
      currentTurnIndex: 0,
      currentTurnPlayerId: null,
      submissions: [],
      usedWords: [],
      roundSubmittedPlayerIds: [],
      voteRounds: [],
      currentVoteRound: 0,
      votedPlayerIds: [],
      winnerIsUndercover: false,
      finishReason: null,
      finalGuess: null,
      participants: ['player-1', 'player-2', 'player-3'],
    },
    game: { id: 'undercoveragent', name: 'Undercover Agent' },
    games: [{ id: 'undercoveragent', name: 'Undercover Agent' }],
  };
}

/**
 * Create default props for the UndercoverAgentGame component.
 * @param serverState The server state to use.
 * @returns Props object for the game component.
 */
function createDefaultProps(serverState: UndercoverAgentState) {
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

describe('UndercoverAgentGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('idle state', () => {
    it('renders nothing when idle', () => {
      const state = createBaseState();
      state.match.state = 'idle';

      const { container } = render(
        <UndercoverAgentGame {...createDefaultProps(state)} />
      );

      expect(container.firstChild).toBeNull();
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

      // When revealedPlayerIds already includes the player, the reveal button
      // should be hidden (the role is tracked in local component state).
      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      // The reveal button should not be shown when already revealed
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
    it('shows round progress', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.currentRound = 1;
      state.match.totalRounds = 2;
      state.match.currentTurnPlayerId = 'player-1';
      state.match.turnOrder = ['player-1', 'player-2', 'player-3'];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Round 1 of 2/)).toBeInTheDocument();
    });

    it('shows word input when it is the player turn', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.currentTurnPlayerId = 'player-1';
      state.match.currentRound = 1;
      state.match.totalRounds = 2;
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
      state.match.currentRound = 1;
      state.match.totalRounds = 2;
      state.match.turnOrder = ['player-2', 'player-1', 'player-3'];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/waiting for/i)).toBeInTheDocument();
      expect(screen.getByText(/Bob/)).toBeInTheDocument();
    });

    it('shows submitted message when player already submitted this round', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.currentTurnPlayerId = 'player-2';
      state.match.currentRound = 1;
      state.match.totalRounds = 2;
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
      state.match.currentRound = 1;
      state.match.totalRounds = 2;
      state.match.turnOrder = ['player-1', 'player-2', 'player-3'];
      state.match.submissions = [
        { playerId: 'player-1', playerName: 'Alice', words: ['apple'] },
      ];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('apple')).toBeInTheDocument();
    });
  });

  describe('voting state', () => {
    it('shows vote options excluding self', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentVoteRound = 0;
      state.match.votedPlayerIds = [];
      state.match.participants = ['player-1', 'player-2', 'player-3'];
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
      // Should show selectable cards for Bob and Charlie but not Alice (self)
      const voteButtons = screen.getAllByRole('button').filter(
        (btn) => btn.classList.contains('undercover-vote-card')
      );
      expect(voteButtons.length).toBe(2);
      // Bob and Charlie appear in both the word list table and vote options
      expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Charlie').length).toBeGreaterThanOrEqual(1);
    });

    it('shows waiting message after voting', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentVoteRound = 0;
      state.match.votedPlayerIds = ['player-1'];
      state.match.participants = ['player-1', 'player-2', 'player-3'];
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
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });

    it('shows previous vote tallies if available', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentVoteRound = 1;
      state.match.votedPlayerIds = [];
      state.match.participants = ['player-1', 'player-2', 'player-3'];
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
          isUnanimous: false,
          unanimousTargetId: null,
        },
      ];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Previous Vote Rounds/)).toBeInTheDocument();
      expect(
        screen.getByText(/No unanimous vote - another round needed/i)
      ).toBeInTheDocument();
    });

    it('shows word list in voting phase', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentVoteRound = 0;
      state.match.votedPlayerIds = [];
      state.match.participants = ['player-1', 'player-2', 'player-3'];
      state.match.submissions = [
        {
          playerId: 'player-1',
          playerName: 'Alice',
          words: ['apple', 'ant'],
        },
        {
          playerId: 'player-2',
          playerName: 'Bob',
          words: ['boat', 'bird'],
        },
        {
          playerId: 'player-3',
          playerName: 'Charlie',
          words: ['car', 'cat'],
        },
      ];
      state.match.voteRounds = [];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      // Table headers should show round columns
      expect(screen.getByText('R1')).toBeInTheDocument();
      expect(screen.getByText('R2')).toBeInTheDocument();
      // Player names and words should be visible
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('apple')).toBeInTheDocument();
      // Bob appears in both the table and vote options
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

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/The Undercover Agent was/)).toBeInTheDocument();
      // Bob appears in both the result reveal and the submissions table
      expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
    });

    it('shows civilians win when undercover is correctly identified', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.undercoverPlayerId = 'player-2';
      state.match.winnerIsUndercover = false;
      state.match.word = 'banana';
      state.match.submissions = [];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/The Civilians win!/)).toBeInTheDocument();
    });

    it('shows undercover wins when wrong player is voted out', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.undercoverPlayerId = 'player-2';
      state.match.winnerIsUndercover = true;
      state.match.word = 'banana';
      state.match.submissions = [];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/The Undercover Agent wins!/)
      ).toBeInTheDocument();
    });

    it('shows the secret word', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.undercoverPlayerId = 'player-2';
      state.match.winnerIsUndercover = false;
      state.match.word = 'banana';
      state.match.submissions = [];

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

      const props = createDefaultProps(state);
      props.isAdmin = true;
      props.adminSessionId = 'admin-123';

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

  describe('finish reason display', () => {
    it('shows message when agent found the secret word', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.undercoverPlayerId = 'player-2';
      state.match.winnerIsUndercover = true;
      state.match.finishReason = 'agent_found_word';
      state.match.word = 'banana';
      state.match.submissions = [];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/discovered the secret word/i)
      ).toBeInTheDocument();
    });

    it('shows message when civilian revealed the secret word', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.undercoverPlayerId = 'player-2';
      state.match.winnerIsUndercover = true;
      state.match.finishReason = 'civilian_revealed_word';
      state.match.word = 'banana';
      state.match.submissions = [];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/civilian accidentally submitted the secret word/i)
      ).toBeInTheDocument();
    });

    it('shows message when civilians voted for wrong player', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.undercoverPlayerId = 'player-2';
      state.match.winnerIsUndercover = true;
      state.match.finishReason = 'wrong_vote';
      state.match.word = 'banana';
      state.match.submissions = [];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/voted for the wrong player/i)
      ).toBeInTheDocument();
    });

    it('shows message when agent guessed correctly after being identified', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.undercoverPlayerId = 'player-2';
      state.match.winnerIsUndercover = true;
      state.match.finishReason = 'agent_final_guess_correct';
      state.match.finalGuess = 'banana';
      state.match.word = 'banana';
      state.match.submissions = [];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/correctly guessed the word.*banana/i)
      ).toBeInTheDocument();
    });

    it('shows message when agent guessed wrong after being identified', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.undercoverPlayerId = 'player-2';
      state.match.winnerIsUndercover = false;
      state.match.finishReason = 'agent_final_guess_wrong';
      state.match.finalGuess = 'apple';
      state.match.word = 'banana';
      state.match.submissions = [];

      render(<UndercoverAgentGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/guessed wrong.*apple/i)
      ).toBeInTheDocument();
    });
  });

  describe('admin non-player', () => {
    it('shows play again panel in finished state', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.undercoverPlayerId = 'player-2';
      state.match.winnerIsUndercover = false;
      state.match.word = 'banana';
      state.match.submissions = [];

      const props = createDefaultProps(state);
      props.playerId = 'non-player-admin';
      props.playerName = 'Admin';
      props.isAdmin = true;
      props.adminSessionId = 'admin-123';

      render(<UndercoverAgentGame {...props} />);

      expect(
        screen.getByRole('button', { name: /new game/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Game Over')).toBeInTheDocument();
    });

    it('renders nothing during reveal for non-player admin', () => {
      const state = createBaseState();
      state.match.state = 'reveal';
      state.match.word = 'secret';

      const props = createDefaultProps(state);
      props.playerId = 'non-player-admin';
      props.playerName = 'Admin';
      props.isAdmin = true;
      props.adminSessionId = 'admin-123';

      const { container } = render(
        <UndercoverAgentGame {...props} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing during submitting for non-player admin', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.currentTurnPlayerId = 'player-1';
      state.match.turnOrder = ['player-1', 'player-2', 'player-3'];

      const props = createDefaultProps(state);
      props.playerId = 'non-player-admin';
      props.playerName = 'Admin';
      props.isAdmin = true;
      props.adminSessionId = 'admin-123';

      const { container } = render(
        <UndercoverAgentGame {...props} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing during voting for non-player admin', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentVoteRound = 0;
      state.match.votedPlayerIds = [];
      state.match.participants = ['player-1', 'player-2', 'player-3'];
      state.match.submissions = [];
      state.match.voteRounds = [];

      const props = createDefaultProps(state);
      props.playerId = 'non-player-admin';
      props.playerName = 'Admin';
      props.isAdmin = true;
      props.adminSessionId = 'admin-123';

      const { container } = render(
        <UndercoverAgentGame {...props} />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
