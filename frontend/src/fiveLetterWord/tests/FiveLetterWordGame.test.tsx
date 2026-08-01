import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FiveLetterWordGame } from '../FiveLetterWordGame';
import type { FiveLetterWordState, PlayerGameState, LetterStatus } from '@lancade/shared';

// Mock fetch globally to prevent API calls
vi.stubGlobal('fetch', vi.fn());

/**
 * Create a player state for testing.
 * @param id Player id.
 * @param name Player name.
 * @returns Player game state.
 */
function createPlayerState(id: string, name: string): PlayerGameState {
  return {
    playerId: id,
    playerName: name,
    grid: [],
    solved: false,
  };
}

/**
 * Create a base server state for testing.
 */
function createBaseState(): FiveLetterWordState {
  return {
    serverTime: Date.now(),
    players: [
      { id: 'player-1', name: 'Alice' },
      { id: 'player-2', name: 'Bob' },
    ],
    settings: {
      categories: [],
      selectedCategory: '',
    },
    gameSettings: {},
    match: {
      id: 1,
      state: 'idle',
      playerStates: [
        createPlayerState('player-1', 'Alice'),
        createPlayerState('player-2', 'Bob'),
      ],
      rowBests: [],
      targetWord: null,
      winnerId: null,
      winnerName: null,
      graceEndsAt: null,
      finishOrder: [],
    },
    game: { id: 'fiveletterword', name: '5 Letter Word' },
    games: [{ id: 'fiveletterword', name: '5 Letter Word' }],
  };
}

/**
 * Default props for the game component.
 */
function createDefaultProps(serverState: FiveLetterWordState) {
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

describe('FiveLetterWordGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('idle state', () => {
    it('renders waiting panel and volume notice when match is idle', () => {
      const state = createBaseState();
      state.match.state = 'idle';

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Waiting for the game to start...')).toBeInTheDocument();
      expect(screen.getByText('Sound On!')).toBeInTheDocument();
    });
  });

  describe('active state', () => {
    it('renders the guess grid', () => {
      const state = createBaseState();
      state.match.state = 'active';

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      // Should have the grid with empty cells
      const cells = document.querySelectorAll('.guess-cell');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('renders the virtual keyboard', () => {
      const state = createBaseState();
      state.match.state = 'active';

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      // Check that the virtual keyboard is rendered
      expect(screen.getByText('Q')).toBeInTheDocument();
      expect(screen.getByText('ENTER')).toBeInTheDocument();
    });

    it('renders submitted rows in the grid', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.playerStates[0].grid = [
        {
          word: 'CRANE',
          letters: ['absent', 'absent', 'present', 'absent', 'correct'],
        },
      ];
      state.match.rowBests = [
        { letters: ['absent', 'absent', 'present', 'absent', 'correct'], greenCount: 1, yellowCount: 1 },
      ];

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      // Check that the grid cells contain the letters
      const gridCells = document.querySelectorAll('.guess-row-submitted .guess-cell');
      expect(gridCells.length).toBe(5);
      expect(gridCells[0].textContent).toBe('C');
      expect(gridCells[1].textContent).toBe('R');
      expect(gridCells[2].textContent).toBe('A');
      expect(gridCells[3].textContent).toBe('N');
      expect(gridCells[4].textContent).toBe('E');
    });

    it('renders row best mini display', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.playerStates[0].grid = [
        {
          word: 'CRANE',
          letters: ['absent', 'absent', 'present', 'absent', 'correct'],
        },
      ];
      state.match.rowBests = [
        { letters: ['correct', 'absent', 'present', 'absent', 'correct'], greenCount: 2, yellowCount: 1 },
      ];

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      // Check that row best mini is rendered
      const rowBestCells = document.querySelectorAll('.row-best-cell');
      expect(rowBestCells.length).toBe(5);
      expect(rowBestCells[0].className).toContain('row-best-cell-correct');
    });

    it('marks used letters on keyboard with their status', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.playerStates[0].grid = [
        {
          word: 'CRANE',
          letters: ['absent', 'absent', 'present', 'absent', 'correct'] as LetterStatus[],
        },
      ];
      state.match.rowBests = [
        { letters: ['absent', 'absent', 'present', 'absent', 'correct'], greenCount: 1, yellowCount: 1 },
      ];

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      // C, R, N should be marked absent (gray)
      const cKey = screen.getByRole('button', { name: 'C' });
      const rKey = screen.getByRole('button', { name: 'R' });
      const nKey = screen.getByRole('button', { name: 'N' });
      expect(cKey.className).toContain('word-keyboard-key-absent');
      expect(rKey.className).toContain('word-keyboard-key-absent');
      expect(nKey.className).toContain('word-keyboard-key-absent');

      // A should be marked present (yellow)
      const aKey = screen.getByRole('button', { name: 'A' });
      expect(aKey.className).toContain('word-keyboard-key-present');

      // E should be marked correct (green)
      const eKey = screen.getByRole('button', { name: 'E' });
      expect(eKey.className).toContain('word-keyboard-key-correct');

      // Unused letters should have no status class
      const qKey = screen.getByRole('button', { name: 'Q' });
      expect(qKey.className).not.toContain('word-keyboard-key-absent');
      expect(qKey.className).not.toContain('word-keyboard-key-present');
      expect(qKey.className).not.toContain('word-keyboard-key-correct');
    });

    it('does not render admin controls during active state', () => {
      const state = createBaseState();
      state.match.state = 'active';

      const props = createDefaultProps(state);
      props.isAdmin = true;
      props.accessKey = 'admin-123';

      render(<FiveLetterWordGame {...props} />);

      expect(screen.queryByText(/play again/i)).not.toBeInTheDocument();
    });
  });

  describe('finished state', () => {
    it('renders winner display when there is a winner', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-1';
      state.match.winnerName = 'Alice';
      state.match.targetWord = 'APPLE';

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/You won/)).toBeInTheDocument();
      expect(screen.getByText('APPLE')).toBeInTheDocument();
    });

    it('renders loss display when no winner', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = null;
      state.match.winnerName = null;
      state.match.targetWord = 'APPLE';

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/No one guessed the word/)).toBeInTheDocument();
    });

    it('renders other player winning', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-2';
      state.match.winnerName = 'Bob';
      state.match.targetWord = 'APPLE';

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      expect(screen.getByText(/Bob wins/)).toBeInTheDocument();
    });

    it('renders admin controls for admin in finished state', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-1';
      state.match.winnerName = 'Alice';
      state.match.targetWord = 'APPLE';

      const props = createDefaultProps(state);
      props.isAdmin = true;
      props.accessKey = 'admin-123';

      render(<FiveLetterWordGame {...props} />);

      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to config/i })).toBeInTheDocument();
    });

    it('does not render admin controls for non-admin', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-1';
      state.match.winnerName = 'Alice';

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      expect(screen.queryByRole('button', { name: /play again/i })).not.toBeInTheDocument();
    });

    it('non-participating admin sees controls in finished state', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-1';
      state.match.winnerName = 'Alice';
      state.match.targetWord = 'APPLE';

      const props = createDefaultProps(state);
      props.playerId = '';
      props.playerName = '';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<FiveLetterWordGame {...props} />);

      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to config/i })).toBeInTheDocument();
      // Non-playing admin sees the game result (Alice won), not their own result
      expect(screen.queryByText(/You won/)).not.toBeInTheDocument();
    });

    it('non-participating admin shows empty observer view during active state', () => {
      const state = createBaseState();
      state.match.state = 'active';
      // Give player-1 a submitted guess; admin (non-participating) should NOT see it as their own
      state.match.playerStates[0].grid = [
        {
          word: 'CRANE',
          letters: ['absent', 'absent', 'present', 'absent', 'correct'],
        },
      ];

      const props = createDefaultProps(state);
      props.playerId = '';
      props.playerName = '';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      const { container } = render(<FiveLetterWordGame {...props} />);

      // Non-participating admin sees no submitted rows (empty grid only)
      const submittedRows = container.querySelectorAll('.guess-row-submitted');
      expect(submittedRows.length).toBe(0);
    });

    it('admin with stale playerId shows empty observer view during active state', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.playerStates[0].grid = [
        {
          word: 'CRANE',
          letters: ['absent', 'absent', 'present', 'absent', 'correct'],
        },
      ];

      const props = createDefaultProps(state);
      props.playerId = 'stale-id';
      props.playerName = 'Stale';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      const { container } = render(<FiveLetterWordGame {...props} />);

      const submittedRows = container.querySelectorAll('.guess-row-submitted');
      expect(submittedRows.length).toBe(0);
    });

    it('admin with stale playerId sees PlayAgainPanel in finished state', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-1';
      state.match.winnerName = 'Alice';
      state.match.targetWord = 'APPLE';

      const props = createDefaultProps(state);
      props.playerId = 'stale-id';
      props.playerName = 'Stale';
      props.isAdmin = true;
      props.isParticipating = false;
      props.accessKey = 'admin-123';

      render(<FiveLetterWordGame {...props} />);

      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
      // Stale-id is not the winner, so should not see "You won"
      expect(screen.queryByText(/You won/)).not.toBeInTheDocument();
    });

    it('renders player summary in multiplayer', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-1';
      state.match.winnerName = 'Alice';
      state.match.targetWord = 'APPLE';
      state.match.playerStates[0].solved = true;
      state.match.playerStates[0].grid = [
        { word: 'APPLE', letters: ['correct', 'correct', 'correct', 'correct', 'correct'] },
      ];
      state.match.finishOrder = [
        { playerId: 'player-1', playerName: 'Alice', solvedAtRow: 1, solved: true },
        { playerId: 'player-2', playerName: 'Bob', solvedAtRow: null, solved: false },
      ];

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
      expect(screen.getByText('Solved in 1 guesses')).toBeInTheDocument();
      expect(screen.getByText('Not solved')).toBeInTheDocument();
    });
  });

  describe('hard mode', () => {
    it('renders locked green cells in current input row', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.gameSettings = { hardMode: 1 };
      state.match.playerStates[0].grid = [
        {
          word: 'CRANE',
          letters: ['absent', 'absent', 'present', 'absent', 'correct'] as LetterStatus[],
        },
      ];
      state.match.rowBests = [
        { letters: ['absent', 'absent', 'present', 'absent', 'correct'], greenCount: 1, yellowCount: 1 },
      ];

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      const currentRowCells = document.querySelectorAll('.guess-row-current .guess-cell');
      expect(currentRowCells.length).toBe(5);
      expect(currentRowCells[4].className).toContain('guess-cell-correct');
      expect(currentRowCells[4].className).toContain('guess-cell-locked');
      expect(currentRowCells[4].textContent).toBe('E');
    });

    it('does not render locked cells in non-hard mode', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.match.playerStates[0].grid = [
        {
          word: 'CRANE',
          letters: ['absent', 'absent', 'present', 'absent', 'correct'] as LetterStatus[],
        },
      ];
      state.match.rowBests = [
        { letters: ['absent', 'absent', 'present', 'absent', 'correct'], greenCount: 1, yellowCount: 1 },
      ];

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      const currentRowCells = document.querySelectorAll('.guess-row-current .guess-cell');
      expect(currentRowCells.length).toBe(5);
      expect(currentRowCells[4].className).not.toContain('guess-cell-locked');
    });

    it('renders multiple locked green cells from multiple rows', () => {
      const state = createBaseState();
      state.match.state = 'active';
      state.gameSettings = { hardMode: 1 };
      state.match.playerStates[0].grid = [
        {
          word: 'CRANE',
          letters: ['absent', 'absent', 'present', 'absent', 'correct'] as LetterStatus[],
        },
        {
          word: 'STARE',
          letters: ['correct', 'absent', 'absent', 'absent', 'correct'] as LetterStatus[],
        },
      ];
      state.match.rowBests = [
        { letters: ['absent', 'absent', 'present', 'absent', 'correct'], greenCount: 1, yellowCount: 1 },
        { letters: ['correct', 'absent', 'absent', 'absent', 'correct'], greenCount: 2, yellowCount: 0 },
      ];

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      const currentRowCells = document.querySelectorAll('.guess-row-current .guess-cell');
      expect(currentRowCells.length).toBe(5);
      expect(currentRowCells[0].className).toContain('guess-cell-correct');
      expect(currentRowCells[0].className).toContain('guess-cell-locked');
      expect(currentRowCells[0].textContent).toBe('S');
      expect(currentRowCells[4].className).toContain('guess-cell-correct');
      expect(currentRowCells[4].className).toContain('guess-cell-locked');
      expect(currentRowCells[4].textContent).toBe('E');
    });

    it('renders green enter button', () => {
      const state = createBaseState();
      state.match.state = 'active';

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      const enterButton = screen.getByText('ENTER');
      expect(enterButton.className).toContain('word-keyboard-key-enter');
    });

    it('renders red backspace button', () => {
      const state = createBaseState();
      state.match.state = 'active';

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      const backButton = screen.getByText('⌫').closest('button');
      expect(backButton!.className).toContain('word-keyboard-key-back');
    });
  });
});
