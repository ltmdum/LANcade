import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DoubleBluffGame } from '../DoubleBluffGame';
import type { DoubleBluffState } from '@lancade/shared';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

vi.mock('../../shared/utils/sounds', () => ({
  playOkaySound: vi.fn(),
  playWarningSound: vi.fn(),
  playWinSound: vi.fn(),
  warmupAudio: vi.fn(),
}));

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

import { playWinSound } from '../../shared/utils/sounds';

function createBaseState(): DoubleBluffState {
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
      cluePhase: 0,
      word: null,
      undercoverPlayerId: null,
      revealedPlayerIds: [],
      readyPlayerIds: [],
      firstClues: [],
      submissions: [],
      submittedPlayerIds: [],
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
    game: { id: 'doublebluff', name: 'Undercover Agent: Double Bluff' },
    games: [{ id: 'doublebluff', name: 'Undercover Agent: Double Bluff' }],
  };
}

function createDefaultProps(serverState: DoubleBluffState) {
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

describe('DoubleBluffGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('idle state', () => {
    it('renders scoreboard when idle with round results', () => {
      const state = createBaseState();
      state.match.state = 'idle';
      state.match.scores = { 'player-1': 2, 'player-2': 0, 'player-3': 0 };
      state.match.finishReason = 'wrong_vote';

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/First to 5 wins!/)).toBeInTheDocument();
    });

    it('renders no scoreboard on fresh idle', () => {
      const state = createBaseState();

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(screen.queryByText(/First to 5 wins!/)).not.toBeInTheDocument();
    });
  });

  describe('reveal state', () => {
    it('shows reveal button when player has not revealed', () => {
      const state = createBaseState();
      state.match.state = 'reveal';
      state.match.word = 'secret';

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Your Role')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /reveal your role/i })
      ).toBeInTheDocument();
    });

    it('hides reveal button once revealed and offers ready', () => {
      const state = createBaseState();
      state.match.state = 'reveal';
      state.match.word = 'banana';
      state.match.revealedPlayerIds = ['player-1'];

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(
        screen.queryByRole('button', { name: /reveal your role/i })
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ready/i })).toBeInTheDocument();
    });

    it('shows nothing for non-participating admin', () => {
      const state = createBaseState();
      state.match.state = 'reveal';

      render(
        <DoubleBluffGame {...createDefaultProps(state)} isParticipating={false} />
      );

      expect(screen.queryByText('Your Role')).not.toBeInTheDocument();
    });
  });

  describe('clue wave 1', () => {
    it('shows wave 1 submit panel for civilians', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.cluePhase = 1;

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Submit Clue 1 of 2')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/your clue word/i)).toBeInTheDocument();
    });

    it('tells the agent to hide their identity in wave 1', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.cluePhase = 1;
      state.match.undercoverPlayerId = 'player-1';

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/don't blow your cover/i)
      ).toBeInTheDocument();
    });

    it('shows the normal clue copy to civilians in wave 1', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.cluePhase = 1;

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/enter your first clue/i)
      ).toBeInTheDocument();
      expect(screen.queryByText(/blow your cover/i)).not.toBeInTheDocument();
    });

    it('shows waiting message after submitting', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.cluePhase = 1;
      state.match.submittedPlayerIds = ['player-1'];

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/you have submitted your clue/i)).toBeInTheDocument();
      expect(screen.getByText(/1\/3/)).toBeInTheDocument();
    });

    it('shows submission progress for non-participants', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.cluePhase = 1;
      state.match.submittedPlayerIds = ['player-2'];

      render(
        <DoubleBluffGame {...createDefaultProps(state)} isParticipating={false} />
      );

      expect(screen.getByText(/players are submitting their clues/i)).toBeInTheDocument();
    });
  });

  describe('clue wave 2', () => {
    it('shows anonymous first clues to the agent', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.cluePhase = 2;
      state.match.undercoverPlayerId = 'player-1';
      state.match.firstClues = ['apple', 'cherry'];

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/civilians' first clues:/i)).toBeInTheDocument();
      expect(screen.getByText('apple')).toBeInTheDocument();
      expect(screen.getByText('cherry')).toBeInTheDocument();
      expect(screen.getByText(/craft a clue/i)).toBeInTheDocument();
    });

    it('does not show first clues to civilians', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.cluePhase = 2;
      state.match.firstClues = ['apple', 'cherry'];

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(
        screen.queryByText(/civilians' first clues:/i)
      ).not.toBeInTheDocument();
    });

    it('shows a message when a clue duplicates a first-round word', async () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.cluePhase = 2;
      state.match.submittedPlayerIds = [];

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: false, reason: 'duplicate_first_clue' }), {
          status: 400,
        })
      );

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      fireEvent.change(screen.getByPlaceholderText(/your clue word/i), {
        target: { value: 'apple' },
      });
      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      expect(
        await screen.findByText(/already submitted that word in the first round/i)
      ).toBeInTheDocument();
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    });
  });

  describe('voting state', () => {
    function makeVotingState(): DoubleBluffState {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentVoteRound = 1;
      state.match.submissions = [
        { playerId: 'player-1', playerName: 'Alice', clues: ['apple'], displayedClue: 'apple' },
        { playerId: 'player-2', playerName: 'Bob', clues: ['boat'], displayedClue: 'boat' },
        { playerId: 'player-3', playerName: 'Charlie', clues: ['car'], displayedClue: 'car' },
      ];
      return state;
    }

    it('shows vote options excluding self', () => {
      const state = makeVotingState();
      state.match.votedPlayerIds = [];
      state.match.voteRounds = [];

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

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

    it('reveals only each player displayed clue before voting', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentVoteRound = 1;
      state.match.votedPlayerIds = [];
      state.match.submissions = [
        {
          playerId: 'player-1',
          playerName: 'Alice',
          clues: ['first0', 'second0'],
          displayedClue: 'first0',
        },
      ];

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('first0')).toBeInTheDocument();
      expect(screen.queryByText('second0')).not.toBeInTheDocument();
    });

    it('shows waiting message after voting', () => {
      const state = makeVotingState();
      state.match.votedPlayerIds = ['player-1'];
      state.match.voteRounds = [];

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(
        screen.getByText(/vote submitted.*waiting/i)
      ).toBeInTheDocument();
    });

    it('shows previous vote tallies with tie message', () => {
      const state = makeVotingState();
      state.match.currentVoteRound = 2;
      state.match.votedPlayerIds = [];
      state.match.voteRounds = [
        {
          tally: [
            { playerId: 'player-1', playerName: 'Alice', count: 1 },
            { playerId: 'player-2', playerName: 'Bob', count: 1 },
            { playerId: 'player-3', playerName: 'Charlie', count: 1 },
          ],
          votedPlayerIds: ['player-1', 'player-2', 'player-3'],
          votes: [
            { playerId: 'player-1', targetPlayerId: 'player-2' },
            { playerId: 'player-2', targetPlayerId: 'player-3' },
            { playerId: 'player-3', targetPlayerId: 'player-1' },
          ],
          isTie: true,
          targetPlayerId: null,
        },
      ];

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Previous Votes for this Round')).toBeInTheDocument();
      expect(
        screen.getByText(/Tie! Another round of voting needed/i)
      ).toBeInTheDocument();
    });
  });

  describe('guessing state', () => {
    it('shows guess input to the undercover agent', () => {
      const state = createBaseState();
      state.match.state = 'guessing';
      state.match.undercoverPlayerId = 'player-1';

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(screen.getByPlaceholderText(/guess the secret word/i)).toBeInTheDocument();
    });

    it('shows waiting message to civilians', () => {
      const state = createBaseState();
      state.match.state = 'guessing';
      state.match.undercoverPlayerId = 'player-2';

      render(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(screen.queryByPlaceholderText(/guess the secret word/i)).not.toBeInTheDocument();
    });
  });

  describe('round over', () => {
    function makeRoundOverState(): DoubleBluffState {
      const state = createBaseState();
      state.match.state = 'idle';
      state.match.finishReason = 'wrong_vote';
      state.match.undercoverPlayerId = 'player-1';
      state.match.word = 'banana';
      state.match.scores = { 'player-1': 3, 'player-2': 1, 'player-3': 0 };
      state.match.roundPoints = { 'player-1': 3, 'player-2': 1, 'player-3': 0 };
      state.match.submissions = [
        {
          playerId: 'player-1',
          playerName: 'Alice',
          clues: ['second0'],
          displayedClue: 'second0',
        },
        {
          playerId: 'player-2',
          playerName: 'Bob',
          clues: ['first1', 'second1'],
          displayedClue: 'first1',
        },
      ];
      state.match.voteRounds = [
        {
          tally: [
            { playerId: 'player-2', playerName: 'Bob', count: 2 },
            { playerId: 'player-3', playerName: 'Charlie', count: 1 },
            { playerId: 'player-1', playerName: 'Alice', count: 0 },
          ],
          votedPlayerIds: ['player-1', 'player-2', 'player-3'],
          votes: [
            { playerId: 'player-1', targetPlayerId: 'player-2' },
            { playerId: 'player-2', targetPlayerId: 'player-3' },
            { playerId: 'player-3', targetPlayerId: 'player-2' },
          ],
          isTie: false,
          targetPlayerId: 'player-2',
        },
      ];
      return state;
    }

    it('shows the agent, the word and the outcome', () => {
      render(<DoubleBluffGame {...createDefaultProps(makeRoundOverState())} />);

      expect(screen.getByText('Round Summary')).toBeInTheDocument();
      expect(screen.getByText('banana')).toBeInTheDocument();
      expect(screen.getByText(/escaped undetected/i)).toBeInTheDocument();
    });

    it('highlights the displayed clue and tags the agent', () => {
      const { container } = render(
        <DoubleBluffGame {...createDefaultProps(makeRoundOverState())} />
      );

      const displayed = Array.from(
        container.querySelectorAll('.undercover-clue--displayed')
      ).map(el => el.textContent);
      expect(displayed).toEqual(['second0', 'first1']);
      expect(screen.getByText(/\(Agent\)/)).toBeInTheDocument();
    });

    it('shows heading row and who each player voted for', () => {
      const { container } = render(
        <DoubleBluffGame {...createDefaultProps(makeRoundOverState())} />
      );

      const headers = container.querySelectorAll('.round-result-table th');
      const headerTexts = Array.from(headers).map((el) => el.textContent);
      expect(headerTexts).toEqual(['Player', 'Clue', 'Voted For']);

      const rows = container.querySelectorAll('.round-result-table tbody tr');
      expect(rows[0]?.textContent).toContain('Bob');
      expect(rows[1]?.textContent).toContain('Charlie');
    });

    it('shows winner banner when the game is finished', () => {
      const state = makeRoundOverState();
      state.match.state = 'finished';
      state.match.winnerIds = ['player-2'];
      state.match.winnerNames = ['Bob'];

      const { container } = render(
        <DoubleBluffGame {...createDefaultProps(state)} />
      );

      const banner = container.querySelector('.undercover-result-winner');
      expect(banner?.textContent).toContain('Bob');
    });
  });

  describe('admin controls', () => {
    it('shows next word button when idle', () => {
      const state = createBaseState();

      render(<DoubleBluffGame {...createDefaultProps(state)} isAdmin />);

      expect(screen.getByRole('button', { name: /next word/i })).toBeInTheDocument();
    });

    it('shows play again panel on game over', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerIds = ['player-2'];
      state.match.winnerNames = ['Bob'];
      state.match.finishReason = 'wrong_vote';

      render(<DoubleBluffGame {...createDefaultProps(state)} isAdmin />);

      expect(
        screen.getByRole('button', { name: /play again/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /back to menu/i })
      ).toBeInTheDocument();
    });
  });

  describe('non-participating admin', () => {
    function adminProps(state: DoubleBluffState) {
      const props = createDefaultProps(state);
      props.playerId = 'non-player-admin';
      props.playerName = 'Admin';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';
      return props;
    }

    it('does not render the submit form during submitting', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.cluePhase = 1;

      render(<DoubleBluffGame {...adminProps(state)} />);

      expect(
        screen.queryByPlaceholderText(/your clue word/i)
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/enter your first clue/i)).not.toBeInTheDocument();
    });

    it('shows submission progress instead of the submit form for non-participants', () => {
      const state = createBaseState();
      state.match.state = 'submitting';
      state.match.cluePhase = 1;
      state.match.submittedPlayerIds = ['player-1'];

      render(<DoubleBluffGame {...adminProps(state)} />);

      expect(
        screen.getByText(/players are submitting their clues/i)
      ).toBeInTheDocument();
    });

    it('does not render the vote panel during voting', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentVoteRound = 1;
      state.match.votedPlayerIds = [];
      state.match.voteRounds = [];
      state.match.submissions = [];

      render(<DoubleBluffGame {...adminProps(state)} />);

      expect(
        screen.queryByText(/who do you think is the undercover agent/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('win celebration', () => {
    it('plays the win celebration when the match transitions to finished', () => {
      const state = createBaseState();
      state.match.state = 'idle';

      const { rerender } = render(<DoubleBluffGame {...createDefaultProps(state)} />);

      state.match.state = 'finished';
      state.match.winnerIds = ['player-1'];
      state.match.winnerNames = ['Alice'];
      state.match.finishReason = 'wrong_vote';

      rerender(<DoubleBluffGame {...createDefaultProps(state)} />);

      expect(playWinSound).toHaveBeenCalledTimes(1);
    });

    it('does not replay the win celebration when the game view remounts while finished', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerIds = ['player-1'];
      state.match.winnerNames = ['Alice'];
      state.match.finishReason = 'wrong_vote';

      const props = createDefaultProps(state);
      const { unmount } = render(<DoubleBluffGame {...props} />);
      unmount();
      render(<DoubleBluffGame {...props} />);

      expect(playWinSound).not.toHaveBeenCalled();
    });
  });
});
