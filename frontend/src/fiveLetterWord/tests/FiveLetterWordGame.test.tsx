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
    playerPassword: 'password123',
    adminSessionId: '',
    isAdmin: false,
    setShowConfig: vi.fn(),
  };
}

describe('FiveLetterWordGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('idle state', () => {
    it('renders nothing when match is idle', () => {
      const state = createBaseState();
      state.match.state = 'idle';

      const { container } = render(
        <FiveLetterWordGame {...createDefaultProps(state)} />
      );

      expect(container.firstChild).toBeNull();
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
      props.adminSessionId = 'admin-123';

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

      expect(screen.getByText(/Bob won/)).toBeInTheDocument();
    });

    it('renders admin controls for admin in finished state', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-1';
      state.match.winnerName = 'Alice';
      state.match.targetWord = 'APPLE';

      const props = createDefaultProps(state);
      props.isAdmin = true;
      props.adminSessionId = 'admin-123';

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

    it('admin non-player sees controls in finished state', () => {
      const state = createBaseState();
      state.match.state = 'finished';
      state.match.winnerId = 'player-1';
      state.match.winnerName = 'Alice';
      state.match.targetWord = 'APPLE';

      const props = createDefaultProps(state);
      props.playerId = '';
      props.playerName = '';
      props.isAdmin = true;
      props.adminSessionId = 'admin-123';

      render(<FiveLetterWordGame {...props} />);

      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to config/i })).toBeInTheDocument();
      // Non-playing admin should NOT see game result UI
      expect(screen.queryByText(/You won/)).not.toBeInTheDocument();
      expect(screen.queryByText('APPLE')).not.toBeInTheDocument();
    });

    it('admin non-player renders nothing during active state', () => {
      const state = createBaseState();
      state.match.state = 'active';

      const props = createDefaultProps(state);
      props.playerId = '';
      props.playerName = '';
      props.isAdmin = true;
      props.adminSessionId = 'admin-123';

      const { container } = render(<FiveLetterWordGame {...props} />);

      expect(container.firstChild).toBeNull();
    });

    it('admin with stale playerId renders nothing during active state', () => {
      const state = createBaseState();
      state.match.state = 'active';

      const props = createDefaultProps(state);
      props.playerId = 'stale-id';
      props.playerName = 'Stale';
      props.isAdmin = true;
      props.adminSessionId = 'admin-123';

      const { container } = render(<FiveLetterWordGame {...props} />);

      expect(container.firstChild).toBeNull();
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
      props.adminSessionId = 'admin-123';

      render(<FiveLetterWordGame {...props} />);

      expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
      expect(screen.queryByText(/You won/)).not.toBeInTheDocument();
      expect(screen.queryByText('APPLE')).not.toBeInTheDocument();
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

      render(<FiveLetterWordGame {...createDefaultProps(state)} />);

      expect(screen.getByText('Results')).toBeInTheDocument();
      expect(screen.getByText('1 guesses')).toBeInTheDocument();
      expect(screen.getByText('Not solved')).toBeInTheDocument();
    });
  });

});
