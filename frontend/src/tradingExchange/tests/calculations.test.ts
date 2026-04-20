import { describe, it, expect } from 'vitest';
import {
  computePosition,
  computeRealizedPnl,
  computeAverageOutstandingPrice,
  computePnlEstimate,
  getPlayerTrades,
  excludeSettlementTrades,
} from '../utils/calculations';
import type { TradingExchangeTrade } from '@lancade/shared';

function trade(buyer: string, seller: string, price: number): TradingExchangeTrade {
  return {
    buyerId: buyer, buyerName: buyer,
    sellerId: seller, sellerName: seller,
    price, timestamp: Date.now(),
  };
}

describe('computePosition', () => {
  it('returns 0 for no trades', () => {
    expect(computePosition([], 'A')).toBe(0);
  });

  it('returns positive for net buys', () => {
    const trades = [trade('A', 'B', 10), trade('A', 'C', 15)];
    expect(computePosition(trades, 'A')).toBe(2);
  });

  it('returns negative for net sells', () => {
    const trades = [trade('B', 'A', 10), trade('C', 'A', 15)];
    expect(computePosition(trades, 'A')).toBe(-2);
  });

  it('excludes settlement trades', () => {
    const trades = [
      trade('A', 'B', 10),
      trade('__exchange__', 'A', 20), // settlement
    ];
    expect(computePosition(trades, 'A')).toBe(1);
  });
});

describe('computeRealizedPnl', () => {
  it('returns 0 when only buys exist', () => {
    const playerTrades = [{ price: 10, side: 'buy' as const }];
    expect(computeRealizedPnl(playerTrades)).toBe(0);
  });

  it('returns 0 when only sells exist', () => {
    const playerTrades = [{ price: 10, side: 'sell' as const }];
    expect(computeRealizedPnl(playerTrades)).toBe(0);
  });

  it('pairs lowest buys with highest sells', () => {
    // Buy at 12, 15, 18; sell at 17
    const playerTrades = [
      { price: 12, side: 'buy' as const },
      { price: 15, side: 'buy' as const },
      { price: 18, side: 'buy' as const },
      { price: 17, side: 'sell' as const },
    ];
    // Pair: sell@17 with buy@12 → 5
    expect(computeRealizedPnl(playerTrades)).toBe(5);
  });

  it('handles multiple pairs', () => {
    const playerTrades = [
      { price: 10, side: 'buy' as const },
      { price: 20, side: 'buy' as const },
      { price: 25, side: 'sell' as const },
      { price: 15, side: 'sell' as const },
    ];
    // Pairs: sell@25 with buy@10 → 15, sell@15 with buy@20 → -5
    expect(computeRealizedPnl(playerTrades)).toBe(10);
  });
});

describe('computeAverageOutstandingPrice', () => {
  it('returns null when flat', () => {
    const playerTrades = [
      { price: 10, side: 'buy' as const },
      { price: 15, side: 'sell' as const },
    ];
    expect(computeAverageOutstandingPrice(playerTrades)).toBeNull();
  });

  it('returns average of remaining buys for long position', () => {
    const playerTrades = [
      { price: 12, side: 'buy' as const },
      { price: 15, side: 'buy' as const },
      { price: 18, side: 'buy' as const },
      { price: 17, side: 'sell' as const },
    ];
    // Paired: buy@12 with sell@17. Outstanding: buy@15, buy@18 → avg 16.5
    expect(computeAverageOutstandingPrice(playerTrades)).toBe(16.5);
  });

  it('returns average of remaining sells for short position', () => {
    const playerTrades = [
      { price: 10, side: 'buy' as const },
      { price: 20, side: 'sell' as const },
      { price: 25, side: 'sell' as const },
    ];
    // Paired: sell@25 with buy@10. Outstanding: sell@20 → avg 20
    expect(computeAverageOutstandingPrice(playerTrades)).toBe(20);
  });
});

describe('computePnlEstimate', () => {
  it('matches the specification example', () => {
    // Bought at 12, 15, 18; sold at 17; estimate = 16
    const playerTrades = [
      { price: 12, side: 'buy' as const },
      { price: 15, side: 'buy' as const },
      { price: 18, side: 'buy' as const },
      { price: 17, side: 'sell' as const },
    ];
    // Realized: sell@17 - buy@12 = 5
    // Unrealized: (16-15) + (16-18) = 1 + (-2) = -1
    // Total: 4
    expect(computePnlEstimate(playerTrades, 16)).toBe(4);
  });

  it('returns 0 for no trades', () => {
    expect(computePnlEstimate([], 100)).toBe(0);
  });

  it('handles short position estimates', () => {
    const playerTrades = [
      { price: 20, side: 'sell' as const },
      { price: 25, side: 'sell' as const },
      { price: 15, side: 'buy' as const },
    ];
    // Paired: sell@25 - buy@15 = 10
    // Outstanding short: sell@20, estimate=22 → 20-22 = -2
    // Total: 8
    expect(computePnlEstimate(playerTrades, 22)).toBe(8);
  });
});

describe('getPlayerTrades', () => {
  it('extracts buys and sells for a player', () => {
    const trades = [
      trade('A', 'B', 10),
      trade('C', 'A', 15),
      trade('B', 'C', 20),
    ];
    const result = getPlayerTrades(trades, 'A');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ price: 10, side: 'buy' });
    expect(result[1]).toEqual({ price: 15, side: 'sell' });
  });
});

describe('excludeSettlementTrades', () => {
  it('filters out exchange trades', () => {
    const trades = [
      trade('A', 'B', 10),
      trade('__exchange__', 'A', 20),
      trade('B', '__exchange__', 15),
    ];
    const result = excludeSettlementTrades(trades);
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(10);
  });
});
