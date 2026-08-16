import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlphabetRaceGame } from '../AlphabetRaceGame';
import type { AlphabetRaceState } from '@lancade/shared';

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
 * @returns Default AlphabetRaceState with three players and idle match.
 */
function createBaseState(): AlphabetRaceState {
  return {
    serverTime: Date.now(),
    players: [
      { id: 'player-1', name: 'Alice' },
      { id: 'player-2', name: 'Bob' },
      { id: 'player-3', name: 'Charlie' },
    ],
    settings: {
      categories: ['Animals'],
      selectedCategory: 'Animals',
    },
    match: {
      id: 0,
      state: 'idle',
      category: 'Animals',
      letterSequence: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
      currentLetterIndex: 0,
      currentLetter: null,
      submittedWord: null,
      submittedBy: null,
      submittedByName: null,
      voteTimeoutMs: 10000,
      voteEndsAt: null,
      votesAccept: 0,
      votesReject: 0,
      votedPlayerIds: [],
      eligibleVoterCount: 0,
      scores: { 'player-1': 0, 'player-2': 0, 'player-3': 0 },
      ineligiblePlayerIds: [],
      completedCount: 0,
      participants: ['player-1', 'player-2', 'player-3'],
      winnerIds: [],
      winnerNames: [],
    },
    game: { id: 'alphabetrace', name: 'Alphabet Race' },
    games: [{ id: 'alphabetrace', name: 'Alphabet Race' }],
  };
}

/**
 * Create default props for the AlphabetRaceGame component.
 * @param serverState Server state to use.
 * @returns Props object.
 */
function createDefaultProps(serverState: AlphabetRaceState) {
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

describe('AlphabetRaceGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('idle state', () => {
    it('renders volume notice when idle', () => {
      const state = createBaseState();
      state.match.state = 'idle';

      render(
        <AlphabetRaceGame {...createDefaultProps(state)} />
      );

      expect(screen.getByText('Sound On!')).toBeInTheDocument();
    });
  });

  describe('racing state', () => {
    it('renders current letter prominently', () => {
      const state = createBaseState();
      state.match.state = 'racing';
      state.match.currentLetter = 'M';

      const { container } = render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      const letterEl = container.querySelector('.alphabet-race-letter');
      expect(letterEl).not.toBeNull();
      expect(letterEl!.textContent).toBe('M');
    });

    it('shows word input for eligible players', () => {
      const state = createBaseState();
      state.match.state = 'racing';
      state.match.currentLetter = 'A';

      render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('shows ineligible message for penalized players', () => {
      const state = createBaseState();
      state.match.state = 'racing';
      state.match.currentLetter = 'B';
      state.match.ineligiblePlayerIds = ['player-1'];

      render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/sitting out/i)).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('shows letter progress', () => {
      const state = createBaseState();
      state.match.state = 'racing';
      state.match.currentLetter = 'C';
      state.match.completedCount = 2;

      render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/2 of 26 completed/)).toBeInTheDocument();
    });

    it('shows scores', () => {
      const state = createBaseState();
      state.match.state = 'racing';
      state.match.currentLetter = 'A';
      state.match.scores = { 'player-1': 5, 'player-2': 3, 'player-3': 1 };

      render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Live Scores')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('shows category when set', () => {
      const state = createBaseState();
      state.match.state = 'racing';
      state.match.currentLetter = 'A';
      state.match.category = 'Animals';

      render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Category: Animals/)).toBeInTheDocument();
    });

    it('clears word input when the letter advances', () => {
      const state = createBaseState();
      state.match.state = 'racing';
      state.match.currentLetter = 'A';

      const { rerender } = render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'apple' } });
      expect(input).toHaveValue('apple');

      state.match.currentLetter = 'B';
      state.match.currentLetterIndex = 1;
      state.match.completedCount = 1;
      rerender(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(screen.getByRole('textbox')).toHaveValue('');
    });
  });

  describe('voting state', () => {
    it('shows submitted word and submitter name', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentLetter = 'A';
      state.match.submittedWord = 'Antelope';
      state.match.submittedBy = 'player-2';
      state.match.submittedByName = 'Bob';
      state.match.eligibleVoterCount = 2;

      render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Antelope')).toBeInTheDocument();
      expect(screen.getByText(/Bob submitted/i)).toBeInTheDocument();
    });

    it('shows accept/reject buttons for non-submitters', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentLetter = 'A';
      state.match.submittedWord = 'Antelope';
      state.match.submittedBy = 'player-2';
      state.match.submittedByName = 'Bob';
      state.match.eligibleVoterCount = 2;

      render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    it('shows waiting message for submitter', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentLetter = 'A';
      state.match.submittedWord = 'Antelope';
      state.match.submittedBy = 'player-1';
      state.match.submittedByName = 'Alice';
      state.match.eligibleVoterCount = 2;

      render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/waiting for votes/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    });

    it('shows ineligible message for penalized players during voting', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentLetter = 'A';
      state.match.submittedWord = 'Antelope';
      state.match.submittedBy = 'player-2';
      state.match.submittedByName = 'Bob';
      state.match.eligibleVoterCount = 1;
      state.match.ineligiblePlayerIds = ['player-1'];

      render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/sitting out/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    });

    it('shows vote counts', () => {
      const state = createBaseState();
      state.match.state = 'voting';
      state.match.currentLetter = 'A';
      state.match.submittedWord = 'Antelope';
      state.match.submittedBy = 'player-2';
      state.match.submittedByName = 'Bob';
      state.match.votesAccept = 1;
      state.match.votesReject = 0;
      state.match.eligibleVoterCount = 2;

      render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Votes: 1 \/ 2/)).toBeInTheDocument();
    });
  });

  describe('finished state', () => {
    it('shows winner message', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerIds = ['player-1'];
      state.match.winnerNames = ['Alice'];
      state.match.completedCount = 26;

      render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/You won!/)).toBeInTheDocument();
      expect(screen.getByText('Final Scores')).toBeInTheDocument();
    });

    it('shows final scores', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerIds = ['player-1'];
      state.match.winnerNames = ['Alice'];
      state.match.scores = { 'player-1': 15, 'player-2': 8, 'player-3': 3 };
      state.match.completedCount = 26;

      render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Final Scores')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('admin sees play again controls', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerIds = ['player-1'];
      state.match.winnerNames = ['Alice'];
      state.match.completedCount = 26;

      const props = createDefaultProps(state);
      props.isAdmin = true;
      props.accessKey = 'admin-123';

      render(<AlphabetRaceGame {...props} />);

      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to configuration/i })).toBeInTheDocument();
    });
  });

  describe('non-participating admin', () => {
    it('shows play again panel in finished state', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerIds = ['player-2'];
      state.match.winnerNames = ['Bob'];
      state.match.completedCount = 26;

      const props = createDefaultProps(state);
      props.playerId = '';
      props.playerName = '';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<AlphabetRaceGame {...props} />);

      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to configuration/i })).toBeInTheDocument();
    });

    it('does not render word submit form during racing', () => {
      const state = createBaseState();
      state.match.state = 'racing';
      state.match.currentLetter = 'A';

      const props = createDefaultProps(state);
      props.playerId = '';
      props.playerName = '';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<AlphabetRaceGame {...props} />);

      // Non-participating admin still sees the letter and category, but no submit form
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
    });

    it('admin with stale playerId does not render word submit form during racing', () => {
      const state = createBaseState();
      state.match.state = 'racing';
      state.match.currentLetter = 'A';

      const props = createDefaultProps(state);
      props.playerId = 'stale-id';
      props.playerName = 'Stale';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<AlphabetRaceGame {...props} />);

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
    });

    it('admin with stale playerId sees controls in finished state', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerIds = ['player-1'];
      state.match.winnerNames = ['Alice'];
      state.match.completedCount = 26;

      const props = createDefaultProps(state);
      props.playerId = 'stale-id';
      props.playerName = 'Stale';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<AlphabetRaceGame {...props} />);

      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
    });
  });

  describe('scoreboard', () => {
    it('shows all player scores sorted descending', () => {
      const state = createBaseState();
      state.match.state = 'racing';
      state.match.currentLetter = 'D';
      state.match.scores = { 'player-1': 2, 'player-2': 5, 'player-3': 1 };

      render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Live Scores')).toBeInTheDocument();

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);

      // Bob (5) should be first, then Alice (2), then Charlie (1)
      expect(listItems[0]).toHaveTextContent(/Bob/);
      expect(listItems[0]).toHaveTextContent(/5/);
      expect(listItems[1]).toHaveTextContent(/Alice/);
      expect(listItems[1]).toHaveTextContent(/2/);
      expect(listItems[2]).toHaveTextContent(/Charlie/);
      expect(listItems[2]).toHaveTextContent(/1/);
    });

    it('shows ineligible players with out indicator', () => {
      const state = createBaseState();
      state.match.state = 'racing';
      state.match.currentLetter = 'A';
      state.match.ineligiblePlayerIds = ['player-2'];

      render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Bob.*\(out\)/)).toBeInTheDocument();
    });
  });

  describe('non-participant view', () => {
    it('shows waiting message for non-participant non-admin', () => {
      const state = createBaseState();
      state.match.state = 'racing';
      state.match.currentLetter = 'A';

      const props = createDefaultProps(state);
      props.playerId = 'late-joiner';
      props.playerName = 'Late';
      props.isAdmin = false;

      render(<AlphabetRaceGame {...props} />);

      expect(screen.getByText(/Waiting for next game/i)).toBeInTheDocument();
    });
  });

  describe('win celebration', () => {
    it('plays the win celebration when the match transitions to finished', () => {
      const state = createBaseState();
      state.match.state = 'racing';
      state.match.currentLetter = 'A';
      state.match.currentLetterIndex = 0;

      const { rerender } = render(<AlphabetRaceGame {...createDefaultProps(state)} />);

      state.match.state = 'finished';
      state.match.winnerIds = ['player-1'];
      state.match.winnerNames = ['Alice'];
      state.match.completedCount = 26;

      rerender(<AlphabetRaceGame {...createDefaultProps(state)} />);

      expect(playWinSound).toHaveBeenCalledTimes(1);
    });

    it('does not replay the win celebration when the game view remounts while finished', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerIds = ['player-1'];
      state.match.winnerNames = ['Alice'];
      state.match.completedCount = 26;

      const props = createDefaultProps(state);
      const { unmount } = render(<AlphabetRaceGame {...props} />);
      unmount();
      render(<AlphabetRaceGame {...props} />);

      expect(playWinSound).not.toHaveBeenCalled();
    });
  });
});
