import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TelepathyGame } from '../TelepathyGame';
import type { TelepathyState } from '@lancade/shared';
import { playWarningSound, playWinSound } from '../../shared/utils/sounds';

vi.mock('../../shared/utils/sounds', () => ({
  playPopSound: vi.fn(),
  playWarningSound: vi.fn(),
  playWinSound: vi.fn(),
  warmupAudio: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockGainNode = {
  connect: vi.fn().mockReturnThis(),
  gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
};
const mockOscNode = {
  connect: vi.fn().mockReturnValue(mockGainNode),
  frequency: { value: 0 },
  type: '',
  start: vi.fn(),
  stop: vi.fn(),
};
vi.stubGlobal('AudioContext', vi.fn(() => ({
  createOscillator: vi.fn().mockReturnValue(mockOscNode),
  createGain: vi.fn().mockReturnValue(mockGainNode),
  destination: {},
  currentTime: 0,
})));

function createBaseState(): TelepathyState {
  return {
    serverTime: Date.now(),
    players: [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ],
    settings: { categories: [], selectedCategory: '' },
    gameSettings: { startingRound: 1 },
    game: { id: 'telepathy', name: 'Telepathy' },
    games: [{ id: 'telepathy', name: 'Telepathy' }],
    telepathy: {
      phase: 'playing',
      round: 1,
      targetRound: 50,
      lastPlaced: null,
      totalPlaced: 0,
      totalCardsInRound: 2,
      hands: {
        p1: [7],
        p2: [3],
      },
      lossDetails: null,
    },
  };
}

function createDefaultProps(state: TelepathyState) {
  return {
    serverState: state,
    connection: 'connected' as const,
    playerId: 'p1',
    playerName: 'Alice',
    accessKey: 'KEY123',
    isAdmin: false,
    isParticipating: true,
    setShowConfig: vi.fn(),
  };
}

describe('TelepathyGame', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.clearAllMocks();
  });

  it('renders the shared pile with placeholder when no card placed', () => {
    render(<TelepathyGame {...createDefaultProps(createBaseState())} />);
    expect(screen.getByText('Shared Pile')).toBeInTheDocument();
    expect(screen.getByText(/—/)).toBeInTheDocument();
  });

  it('shows the last placed card on the shared pile', () => {
    const state = createBaseState();
    state.telepathy.lastPlaced = 7;
    state.telepathy.hands = { p1: [10], p2: [3] };
    render(<TelepathyGame {...createDefaultProps(state)} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders player hand cards', () => {
    render(<TelepathyGame {...createDefaultProps(createBaseState())} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders place button for participating player', () => {
    render(<TelepathyGame {...createDefaultProps(createBaseState())} />);
    expect(screen.getByRole('button', { name: /place/i })).toBeEnabled();
  });

  it('disables place button for non-participating player', () => {
    const props = createDefaultProps(createBaseState());
    props.isParticipating = false;
    render(<TelepathyGame {...props} />);
    expect(screen.queryByRole('button', { name: /place/i })).not.toBeInTheDocument();
  });

  it('shows no cards message when hand is empty', () => {
    const state = createBaseState();
    state.telepathy.hands = { p1: [], p2: [] };
    const props = createDefaultProps(state);
    props.playerId = 'p1';
    render(<TelepathyGame {...props} />);
    expect(screen.getByText(/no cards to place/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /place/i })).not.toBeInTheDocument();
  });

  it('sends place action on button click', async () => {
    render(<TelepathyGame {...createDefaultProps(createBaseState())} />);
    fireEvent.click(screen.getByRole('button', { name: /place/i }));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/round/action',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          playerId: 'p1',
          action: { type: 'place' },
          key: 'KEY123',
        }),
      })
    );
  });

  it('shows waiting message when player has no cards', () => {
    const state = createBaseState();
    state.telepathy.hands = { p1: [], p2: [3] };
    const props = createDefaultProps(state);
    props.playerId = 'p1';
    render(<TelepathyGame {...props} />);
    expect(screen.getByText(/no cards to place/i)).toBeInTheDocument();
  });

  it('renders idle state', () => {
    const state = createBaseState();
    state.telepathy.phase = 'idle';
    render(<TelepathyGame {...createDefaultProps(state)} />);
    expect(screen.getByText(/waiting for the game to start/i)).toBeInTheDocument();
  });

  it('renders won state', () => {
    const state = createBaseState();
    state.telepathy.phase = 'won';
    state.telepathy.targetRound = 50;
    render(<TelepathyGame {...createDefaultProps(state)} />);
    expect(screen.getByText(/congratulations/i)).toBeInTheDocument();
  });

  it('shows back to config for admin in won state', () => {
    const state = createBaseState();
    state.telepathy.phase = 'won';
    const props = createDefaultProps(state);
    props.isAdmin = true;
    render(<TelepathyGame {...props} />);
    expect(screen.getByRole('button', { name: /back to config/i })).toBeInTheDocument();
  });

  it('renders lost state with loss details', () => {
    const state = createBaseState();
    state.telepathy.phase = 'lost';
    state.telepathy.round = 3;
    state.telepathy.lossDetails = {
      placedByPlayerId: 'p1',
      placedCard: 27,
      blockedByPlayerId: 'p2',
      blockedCard: 23,
      round: 3,
    };
    render(<TelepathyGame {...createDefaultProps(state)} />);
    expect(screen.getByText(/round lost/i)).toBeInTheDocument();
    expect(screen.getByText(/Alice placed 27 but Bob still has 23/i)).toBeInTheDocument();
    expect(screen.getByText(/going back to 2 cards per player/i)).toBeInTheDocument();
  });

  it('shows staying message when losing in round 1', () => {
    const state = createBaseState();
    state.telepathy.phase = 'lost';
    state.telepathy.round = 1;
    state.telepathy.lossDetails = {
      placedByPlayerId: 'p1',
      placedCard: 7,
      blockedByPlayerId: 'p2',
      blockedCard: 3,
      round: 1,
    };
    render(<TelepathyGame {...createDefaultProps(state)} />);
    expect(screen.getByText(/staying at 1 card per player/i)).toBeInTheDocument();
  });

  it('shows continue button for admin in lost state', () => {
    const state = createBaseState();
    state.telepathy.phase = 'lost';
    state.telepathy.lossDetails = {
      placedByPlayerId: 'p1',
      placedCard: 27,
      blockedByPlayerId: 'p2',
      blockedCard: 23,
      round: 3,
    };
    const props = createDefaultProps(state);
    props.isAdmin = true;
    render(<TelepathyGame {...props} />);
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeInTheDocument();
  });

  it('does not show continue button for non-admin in lost state', () => {
    const state = createBaseState();
    state.telepathy.phase = 'lost';
    state.telepathy.lossDetails = {
      placedByPlayerId: 'p1',
      placedCard: 27,
      blockedByPlayerId: 'p2',
      blockedCard: 23,
      round: 3,
    };
    render(<TelepathyGame {...createDefaultProps(state)} />);
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
  });

  it('sends progress action on continue click', async () => {
    const state = createBaseState();
    state.telepathy.phase = 'lost';
    state.telepathy.lossDetails = {
      placedByPlayerId: 'p1',
      placedCard: 27,
      blockedByPlayerId: 'p2',
      blockedCard: 23,
      round: 3,
    };
    const props = createDefaultProps(state);
    props.isAdmin = true;
    render(<TelepathyGame {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/round/action',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          playerId: 'p1',
          action: { type: 'progress' },
          key: 'KEY123',
        }),
      })
    );
  });

  it('plays warning sound on the losing player device when the round is lost', () => {
    const state = createBaseState();
    const { rerender } = render(<TelepathyGame {...createDefaultProps(state)} />);

    state.telepathy.phase = 'lost';
    state.telepathy.lossDetails = {
      placedByPlayerId: 'p1',
      placedCard: 27,
      blockedByPlayerId: 'p2',
      blockedCard: 23,
      round: 3,
    };

    rerender(<TelepathyGame {...createDefaultProps(state)} />);

    expect(playWarningSound).toHaveBeenCalledTimes(1);
  });

  it('does not play warning sound on non-losing devices when the round is lost', () => {
    const state = createBaseState();
    const { rerender } = render(<TelepathyGame {...createDefaultProps(state)} />);

    state.telepathy.phase = 'lost';
    state.telepathy.lossDetails = {
      placedByPlayerId: 'p2',
      placedCard: 27,
      blockedByPlayerId: 'p1',
      blockedCard: 23,
      round: 3,
    };

    rerender(<TelepathyGame {...createDefaultProps(state)} />);

    expect(playWarningSound).not.toHaveBeenCalled();
  });

  it('plays win sound on every device when a round is completed', () => {
    const state = createBaseState();
    const { rerender } = render(<TelepathyGame {...createDefaultProps(state)} />);

    state.telepathy.phase = 'round_complete';
    state.telepathy.totalPlaced = 2;

    rerender(<TelepathyGame {...createDefaultProps(state)} />);

    expect(playWinSound).toHaveBeenCalledTimes(1);
  });

  it('plays win sound on every device when the game is won', () => {
    const state = createBaseState();
    const { rerender } = render(<TelepathyGame {...createDefaultProps(state)} />);

    state.telepathy.phase = 'won';

    rerender(<TelepathyGame {...createDefaultProps(state)} />);

    expect(playWinSound).toHaveBeenCalledTimes(1);
  });

  it('does not play win sound on initial round_complete render', () => {
    const state = createBaseState();
    state.telepathy.phase = 'round_complete';
    render(<TelepathyGame {...createDefaultProps(state)} />);
    expect(playWinSound).not.toHaveBeenCalled();
  });

  it('renders round_complete state with success banner', () => {
    const state = createBaseState();
    state.telepathy.phase = 'round_complete';
    state.telepathy.totalPlaced = 2;
    state.telepathy.totalCardsInRound = 2;
    render(<TelepathyGame {...createDefaultProps(state)} />);
    expect(screen.getByText(/round 1 complete/i)).toBeInTheDocument();
  });

  it('shows continue button for admin in round_complete', () => {
    const state = createBaseState();
    state.telepathy.phase = 'round_complete';
    const props = createDefaultProps(state);
    props.isAdmin = true;
    render(<TelepathyGame {...props} />);
    expect(screen.getByRole('button', { name: /continue to round/i })).toBeInTheDocument();
  });

  it('does not show continue button for non-admin in round_complete', () => {
    const state = createBaseState();
    state.telepathy.phase = 'round_complete';
    render(<TelepathyGame {...createDefaultProps(state)} />);
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
    expect(screen.getByText(/waiting for admin to continue/i)).toBeInTheDocument();
  });

  it('sends progress action on continue from round_complete', async () => {
    const state = createBaseState();
    state.telepathy.phase = 'round_complete';
    const props = createDefaultProps(state);
    props.isAdmin = true;
    render(<TelepathyGame {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /continue to round 2/i }));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/round/action',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          playerId: 'p1',
          action: { type: 'progress' },
          key: 'KEY123',
        }),
      })
    );
  });

  it('shows round info', () => {
    const state = createBaseState();
    state.telepathy.round = 3;
    state.telepathy.totalPlaced = 2;
    state.telepathy.totalCardsInRound = 6;
    render(<TelepathyGame {...createDefaultProps(state)} />);
    expect(screen.getByText(/round 3/i)).toBeInTheDocument();
    expect(screen.getByText(/2 of 6 placed/i)).toBeInTheDocument();
  });

  it('makes hand cards horizontally scrollable', () => {
    const state = createBaseState();
    state.telepathy.hands = {
      p1: [3, 7, 12, 18, 25, 31, 42, 56, 63, 78],
      p2: [5],
    };
    const { container } = render(<TelepathyGame {...createDefaultProps(state)} />);
    const cardsContainer = container.querySelector('.telepathy-hand-cards');
    expect(cardsContainer).toBeInTheDocument();
  });
});
