import { describe, it, expect } from 'vitest';
import { createGame } from '../tradingexchange.js';
import { createPlayerStore } from '../../shared/stores/player-store.js';
import { withFakeTimers } from '../../shared/tests/helpers.js';
import type { TradingExchangeState } from '@lancade/shared';

type ExchangeState = Omit<TradingExchangeState, 'game' | 'games'> & {
  gameSettings: Record<string, unknown>;
};

function setupGame(playerNames: string[]) {
  const store = createPlayerStore();
  const ids: string[] = [];
  for (const name of playerNames) {
    const result = store.joinPlayer({ name });
    ids.push(result.playerId!);
  }
  const game = createGame({ playerStore: store });
  return { game, store, ids };
}

function getExchangeState(game: ReturnType<typeof createGame>): ExchangeState {
  return game.getState() as ExchangeState;
}

/** Helper: submit orders via handleAction. */
function submitOrders(game: ReturnType<typeof createGame>, playerId: string, bid: number, offer: number) {
  return game.handleAction(playerId, { type: 'submit_orders', bid, offer });
}

describe('tradingexchange', () => {
  describe('start validation', () => {
    it('rejects start with fewer than 2 players', async () => {
      await withFakeTimers(() => {
        const { game } = setupGame(['Alice']);
        expect(game.startRound(30000).reason).toBe('need_2_players');
      });
    });

    it('rejects start when already active', async () => {
      await withFakeTimers(() => {
        const { game } = setupGame(['Alice', 'Bob']);
        game.startRound(30000);
        expect(game.startRound(30000).reason).toBe('round_active');
      });
    });

    it('starts successfully with 2+ players', async () => {
      await withFakeTimers(() => {
        const { game } = setupGame(['Alice', 'Bob']);
        expect(game.startRound(30000).ok).toBe(true);
        expect(getExchangeState(game).exchange.state).toBe('auction');
      });
    });
  });

  describe('auction phase', () => {
    it('deals cards to all players', async () => {
      await withFakeTimers(() => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.startRound(30000);
        const state = getExchangeState(game);
        for (const id of ids) {
          expect(state.exchange.playerCards[id]).toHaveLength(state.exchange.cardsPerPlayer);
        }
      });
    });

    it('tracks auction submissions', async () => {
      await withFakeTimers(() => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.startRound(30000);
        submitOrders(game, ids[0], 10, 20);
        const state = getExchangeState(game);
        expect(state.exchange.auctionSubmittedIds).toContain(ids[0]);
        expect(state.exchange.state).toBe('auction');
      });
    });

    it('transitions to trading after all players submit', async () => {
      await withFakeTimers(() => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.startRound(30000);
        submitOrders(game, ids[0], 10, 20);
        submitOrders(game, ids[1], 12, 22);
        const state = getExchangeState(game);
        expect(state.exchange.state).toBe('trading');
        expect(state.exchange.currentRound).toBe(1);
      });
    });

    it('matches crossed auction orders', async () => {
      await withFakeTimers(() => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.startRound(30000);
        submitOrders(game, ids[0], 25, 30);
        submitOrders(game, ids[1], 5, 10);
        const trades = getExchangeState(game).exchange.trades;
        expect(trades).toHaveLength(1);
        expect(trades[0].buyerId).toBe(ids[0]);
        expect(trades[0].sellerId).toBe(ids[1]);
        expect(trades[0].price).toBe(17.5);
      });
    });

    it('leaves equal remaining bids and offers after auction', async () => {
      await withFakeTimers(() => {
        const { game, ids } = setupGame(['Alice', 'Bob', 'Charlie']);
        game.startRound(30000);
        submitOrders(game, ids[0], 25, 30);
        submitOrders(game, ids[1], 5, 10);
        submitOrders(game, ids[2], 8, 28);
        const orders = getExchangeState(game).exchange.orders;
        const remainingBids = orders.filter((o) => o.bid !== null);
        const remainingOffers = orders.filter((o) => o.offer !== null);
        expect(remainingBids.length).toBe(remainingOffers.length);
      });
    });
  });

  describe('handleAction validation', () => {
    it('rejects unknown action type', async () => {
      await withFakeTimers(() => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.startRound(30000);
        expect(game.handleAction(ids[0], { type: 'unknown' }).reason).toBe('unknown_action');
      });
    });

    it('rejects bid >= offer', async () => {
      await withFakeTimers(() => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.startRound(30000);
        expect(submitOrders(game, ids[0], 20, 20).reason).toBe('bid_must_be_less_than_offer');
      });
    });

    it('rejects negative values', async () => {
      await withFakeTimers(() => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.startRound(30000);
        expect(submitOrders(game, ids[0], -1, 10).reason).toBe('negative_value');
      });
    });

    it('rejects invalid payload', async () => {
      await withFakeTimers(() => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.startRound(30000);
        expect(game.handleAction(ids[0], null).reason).toBe('unknown_action');
        expect(game.handleAction(ids[0], { type: 'submit_orders' }).reason).toBe('invalid_payload');
      });
    });

    it('rejects non-participant submissions', async () => {
      await withFakeTimers(() => {
        const { game } = setupGame(['Alice', 'Bob']);
        game.startRound(30000);
        expect(submitOrders(game, 'unknown-id', 10, 20).reason).toBe('not_participant');
      });
    });
  });

  describe('continuous trading', () => {
    function startTrading(names: string[]) {
      const setup = setupGame(names);
      setup.game.startRound(30000);
      for (const id of setup.ids) submitOrders(setup.game, id, 1, 100);
      expect(getExchangeState(setup.game).exchange.state).toBe('trading');
      return setup;
    }

    it('matches crossing continuous orders', async () => {
      await withFakeTimers(() => {
        const { game, ids } = startTrading(['Alice', 'Bob']);
        submitOrders(game, ids[0], 20, 30);
        submitOrders(game, ids[1], 5, 15);
        const state = getExchangeState(game);
        const continuousTrades = state.exchange.trades.filter(
          (t) => t.buyerName !== 'Exchange' && t.sellerName !== 'Exchange',
        );
        expect(continuousTrades.length).toBeGreaterThanOrEqual(1);
        const lastTrade = continuousTrades[continuousTrades.length - 1];
        expect(lastTrade.price).toBe(20);
      });
    });

    it("clears traded side from player's order", async () => {
      await withFakeTimers(() => {
        const { game, ids } = startTrading(['Alice', 'Bob']);
        submitOrders(game, ids[0], 20, 30);
        submitOrders(game, ids[1], 5, 15);
        const state = getExchangeState(game);
        const bobOrder = state.exchange.orders.find((o) => o.playerId === ids[1]);
        expect(bobOrder?.offer).toBeNull();
        const aliceOrder = state.exchange.orders.find((o) => o.playerId === ids[0]);
        expect(aliceOrder?.bid).toBeNull();
      });
    });

    it('replaces existing orders on resubmission', async () => {
      await withFakeTimers(() => {
        const { game, ids } = startTrading(['Alice', 'Bob']);
        submitOrders(game, ids[0], 10, 20);
        submitOrders(game, ids[0], 12, 22);
        const order = getExchangeState(game).exchange.orders.find((o) => o.playerId === ids[0]);
        expect(order?.bid).toBe(12);
        expect(order?.offer).toBe(22);
      });
    });
  });

  describe('timer and rounds', () => {
    it('advances round when inactivity timer expires', async () => {
      await withFakeTimers((timers) => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.startRound(5000);
        for (const id of ids) submitOrders(game, id, 1, 100);
        expect(getExchangeState(game).exchange.currentRound).toBe(1);
        timers.advance(5001);
        expect(getExchangeState(game).exchange.currentRound).toBe(2);
      });
    });

    it('reveals cards as rounds progress', async () => {
      await withFakeTimers((timers) => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.updateSettings({ cardsPerPlayer: 2 });
        game.startRound(5000);
        for (const id of ids) submitOrders(game, id, 1, 100);
        expect(getExchangeState(game).exchange.revealedCardCount).toBe(0);
        timers.advance(5001);
        expect(getExchangeState(game).exchange.revealedCardCount).toBe(1);
        timers.advance(5001);
        expect(getExchangeState(game).exchange.revealedCardCount).toBe(2);
      });
    });

    it('finishes game after all trading rounds complete', async () => {
      await withFakeTimers((timers) => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.updateSettings({ cardsPerPlayer: 1 });
        game.startRound(5000);
        for (const id of ids) submitOrders(game, id, 1, 100);
        expect(getExchangeState(game).exchange.totalRounds).toBe(2);
        timers.advance(5001);
        timers.advance(5001);
        expect(getExchangeState(game).exchange.state).toBe('finished');
      });
    });

    it('resets timer on trade during continuous trading', async () => {
      await withFakeTimers((timers) => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.updateSettings({ cardsPerPlayer: 1 });
        game.startRound(5000);
        for (const id of ids) submitOrders(game, id, 1, 100);

        timers.advance(4000);
        expect(getExchangeState(game).exchange.state).toBe('trading');

        submitOrders(game, ids[0], 50, 60);
        submitOrders(game, ids[1], 10, 40);

        timers.advance(4000);
        expect(getExchangeState(game).exchange.state).toBe('trading');

        timers.advance(1001);
        expect(getExchangeState(game).exchange.currentRound).toBe(2);
      });
    });
  });

  describe('settlement and leaderboard', () => {
    it('settles outstanding positions at true value', async () => {
      await withFakeTimers((timers) => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.updateSettings({ cardsPerPlayer: 1 });
        game.startRound(5000);

        for (const id of ids) submitOrders(game, id, 1, 100);
        submitOrders(game, ids[0], 50, 60);
        submitOrders(game, ids[1], 10, 40);

        timers.advance(5001);
        timers.advance(5001);

        const state = getExchangeState(game);
        expect(state.exchange.state).toBe('finished');
        expect(state.exchange.trueValue).not.toBeNull();
        const settlementTrades = state.exchange.trades.filter(
          (t) => t.buyerName === 'Exchange' || t.sellerName === 'Exchange',
        );
        expect(settlementTrades.length).toBeGreaterThan(0);
      });
    });

    it('produces a sorted leaderboard', async () => {
      await withFakeTimers((timers) => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.updateSettings({ cardsPerPlayer: 1 });
        game.startRound(5000);

        for (const id of ids) submitOrders(game, id, 1, 100);
        timers.advance(5001);
        timers.advance(5001);

        const lb = getExchangeState(game).exchange.leaderboard!;
        expect(lb.length).toBe(2);
        expect(lb[0].pnl).toBeGreaterThanOrEqual(lb[1].pnl);
      });
    });

    it('reveals true value only when finished', async () => {
      await withFakeTimers((timers) => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.updateSettings({ cardsPerPlayer: 1 });
        game.startRound(5000);
        for (const id of ids) submitOrders(game, id, 1, 100);
        expect(getExchangeState(game).exchange.trueValue).toBeNull();
        timers.advance(5001);
        timers.advance(5001);
        expect(getExchangeState(game).exchange.trueValue).not.toBeNull();
      });
    });
  });

  describe('updateSettings', () => {
    it('updates cardsPerPlayer when idle', () => {
      const { game } = setupGame(['Alice', 'Bob']);
      expect(game.updateSettings({ cardsPerPlayer: 3 }).ok).toBe(true);
      const state = getExchangeState(game);
      expect(state.gameSettings.cardsPerPlayer).toBe(3);
    });

    it('rejects invalid cardsPerPlayer values', () => {
      const { game } = setupGame(['Alice', 'Bob']);
      expect(game.updateSettings({ cardsPerPlayer: 0 }).ok).toBe(false);
      expect(game.updateSettings({ cardsPerPlayer: 14 }).ok).toBe(false);
      expect(game.updateSettings({ cardsPerPlayer: 2.5 }).ok).toBe(false);
    });

    it('accepts cardsPerPlayer up to 13', () => {
      const { game } = setupGame(['Alice', 'Bob']);
      expect(game.updateSettings({ cardsPerPlayer: 13 }).ok).toBe(true);
      expect((game.getState() as ExchangeState).gameSettings.cardsPerPlayer).toBe(13);
    });

    it('accepts autoSubmitMs setting', () => {
      const { game } = setupGame(['Alice', 'Bob']);
      expect(game.updateSettings({ autoSubmitMs: 10000 }).ok).toBe(true);
      expect((game.getState() as ExchangeState).gameSettings.autoSubmitMs).toBe(10000);
      expect(game.updateSettings({ autoSubmitMs: 0 }).ok).toBe(true);
      expect((game.getState() as ExchangeState).gameSettings.autoSubmitMs).toBe(0);
    });

    it('rejects settings changes during active game', async () => {
      await withFakeTimers(() => {
        const { game } = setupGame(['Alice', 'Bob']);
        game.startRound(30000);
        expect(game.updateSettings({ cardsPerPlayer: 3 }).reason).toBe('game_active');
      });
    });

    it('accepts settings changes after a finished game', async () => {
      await withFakeTimers((timers) => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.updateSettings({ cardsPerPlayer: 1 });
        game.startRound(5000);
        for (const id of ids) submitOrders(game, id, 1, 100);
        timers.advance(5001);
        timers.advance(5001);
        expect(getExchangeState(game).exchange.state).toBe('finished');
        // Must be able to change settings for the next game
        expect(game.updateSettings({ cardsPerPlayer: 4 }).ok).toBe(true);
        expect((game.getState() as ExchangeState).gameSettings.cardsPerPlayer).toBe(4);
      });
    });

    it('rejects unknown settings', () => {
      const { game } = setupGame(['Alice', 'Bob']);
      expect(game.updateSettings({ unknownKey: 42 }).reason).toBe('unknown_setting');
    });

    it('applies cardsPerPlayer to the next game', async () => {
      await withFakeTimers(() => {
        const { game, ids } = setupGame(['Alice', 'Bob']);
        game.updateSettings({ cardsPerPlayer: 3 });
        game.startRound(5000);
        const state = getExchangeState(game);
        expect(state.exchange.cardsPerPlayer).toBe(3);
        expect(state.exchange.totalRounds).toBe(4);
        for (const id of ids) {
          expect(state.exchange.playerCards[id]).toHaveLength(3);
        }
      });
    });
  });

  describe('endGame', () => {
    it('ends an active game and resets to idle', async () => {
      await withFakeTimers(() => {
        const { game } = setupGame(['Alice', 'Bob']);
        game.startRound(30000);
        expect(game.endGame().ok).toBe(true);
        expect(getExchangeState(game).exchange.state).toBe('idle');
      });
    });

    it('rejects ending an idle game', () => {
      const { game } = setupGame(['Alice', 'Bob']);
      expect(game.endGame().ok).toBe(false);
    });
  });

  describe('getPhase', () => {
    it('returns idle initially', () => {
      const { game } = setupGame(['Alice', 'Bob']);
      expect(game.getPhase()).toBe('idle');
    });

    it('returns auction after start', async () => {
      await withFakeTimers(() => {
        const { game } = setupGame(['Alice', 'Bob']);
        game.startRound(30000);
        expect(game.getPhase()).toBe('auction');
      });
    });
  });

  describe('submitWord and submitVotes', () => {
    it('both return not_supported', () => {
      const { game } = setupGame(['Alice', 'Bob']);
      expect(game.submitWord('any', 'word').reason).toBe('not_supported');
      expect(game.submitVotes('any', {}).reason).toBe('not_supported');
    });
  });

  describe('player colours', () => {
    it('assigns unique colours to each player', async () => {
      await withFakeTimers(() => {
        const { game } = setupGame(['Alice', 'Bob', 'Charlie']);
        game.startRound(30000);
        const colours = Object.values(getExchangeState(game).exchange.playerColours);
        expect(new Set(colours).size).toBe(3);
      });
    });
  });

  describe('gameSettings in state', () => {
    it('includes gameSettings in broadcast state', () => {
      const { game } = setupGame(['Alice', 'Bob']);
      const state = getExchangeState(game);
      expect(state.gameSettings).toBeDefined();
      expect(state.gameSettings.cardsPerPlayer).toBe(2);
    });
  });
});
