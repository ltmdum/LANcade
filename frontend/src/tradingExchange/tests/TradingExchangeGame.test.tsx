import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { TradingExchangeGame } from '../TradingExchangeGame';
import type { TradingExchangeState } from '@lancade/shared';

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
function createBaseState(): TradingExchangeState {
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
    exchange: {
      id: 1,
      state: 'idle',
      cardsPerPlayer: 0,
      inactivityTimeoutMs: 0,
      autoSubmitMs: 0,
      playerCards: {},
      revealedCardCount: 0,
      currentRound: 0,
      totalRounds: 1,
      orders: [],
      trades: [],
      roundEndsAt: null,
      autoSubmitEndsAt: {},
      playerColours: {},
      participants: ['player-1', 'player-2'],
      auctionSubmittedIds: [],
      winnerIds: [],
      winnerNames: [],
      leaderboard: null,
      trueValue: null,
    },
    game: { id: 'tradingexchange', name: 'Trading Exchange' },
    games: [{ id: 'tradingexchange', name: 'Trading Exchange' }],
  };
}

/**
 * Default props for the game component.
 */
function createDefaultProps(serverState: TradingExchangeState) {
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

describe('TradingExchangeGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('win celebration', () => {
    it('plays the win celebration when the exchange transitions to finished', () => {
      const state = createBaseState();
      state.exchange.state = 'trading';

      const { rerender } = render(<TradingExchangeGame {...createDefaultProps(state)} />);

      state.exchange.state = 'finished';
      state.exchange.winnerIds = ['player-1'];
      state.exchange.winnerNames = ['Alice'];

      rerender(<TradingExchangeGame {...createDefaultProps(state)} />);

      expect(playWinSound).toHaveBeenCalledTimes(1);
    });

    it('does not replay the win celebration when the game view remounts while finished', () => {
      const state = createBaseState();
      state.exchange.state = 'finished';
      state.exchange.winnerIds = ['player-1'];
      state.exchange.winnerNames = ['Alice'];

      const props = createDefaultProps(state);
      const { unmount } = render(<TradingExchangeGame {...props} />);
      unmount();
      render(<TradingExchangeGame {...props} />);

      expect(playWinSound).not.toHaveBeenCalled();
    });
  });
});