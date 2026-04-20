import { describe, it, expect } from 'vitest';
import {
  matchAuction,
  matchBidAgainstOffers,
  matchOfferAgainstBids,
} from '../matching.js';

describe('matchAuction', () => {
  it('matches highest bid with lowest offer', () => {
    const bids = [
      { playerId: 'A', price: 20, timestamp: 1 },
      { playerId: 'B', price: 15, timestamp: 2 },
    ];
    const offers = [
      { playerId: 'C', price: 10, timestamp: 1 },
      { playerId: 'D', price: 25, timestamp: 2 },
    ];
    const trades = matchAuction(bids, offers);
    expect(trades).toHaveLength(1);
    expect(trades[0]).toEqual({ buyerId: 'A', sellerId: 'C', price: 15 });
  });

  it('matches multiple crossed pairs', () => {
    const bids = [
      { playerId: 'A', price: 20, timestamp: 1 },
      { playerId: 'B', price: 16, timestamp: 2 },
      { playerId: 'C', price: 12, timestamp: 3 },
    ];
    const offers = [
      { playerId: 'D', price: 8, timestamp: 1 },
      { playerId: 'E', price: 15, timestamp: 2 },
      { playerId: 'F', price: 25, timestamp: 3 },
    ];
    const trades = matchAuction(bids, offers);
    expect(trades).toHaveLength(2);
    expect(trades[0]).toEqual({ buyerId: 'A', sellerId: 'D', price: 14 });
    expect(trades[1]).toEqual({ buyerId: 'B', sellerId: 'E', price: 15.5 });
  });

  it('produces no trades when no crosses exist', () => {
    const bids = [{ playerId: 'A', price: 5, timestamp: 1 }];
    const offers = [{ playerId: 'B', price: 10, timestamp: 1 }];
    expect(matchAuction(bids, offers)).toHaveLength(0);
  });

  it('breaks ties by earliest timestamp', () => {
    const bids = [
      { playerId: 'A', price: 20, timestamp: 100 },
      { playerId: 'B', price: 20, timestamp: 50 },
    ];
    const offers = [
      { playerId: 'C', price: 10, timestamp: 200 },
      { playerId: 'D', price: 10, timestamp: 100 },
    ];
    const trades = matchAuction(bids, offers);
    expect(trades).toHaveLength(2);
    // B submitted earlier, but A has same price - ties broken by timestamp (ascending)
    expect(trades[0].buyerId).toBe('B');
    expect(trades[0].sellerId).toBe('D');
    expect(trades[1].buyerId).toBe('A');
    expect(trades[1].sellerId).toBe('C');
  });

  it('leaves equal remaining bids and offers', () => {
    const bids = [
      { playerId: 'A', price: 20, timestamp: 1 },
      { playerId: 'B', price: 15, timestamp: 2 },
      { playerId: 'C', price: 10, timestamp: 3 },
    ];
    const offers = [
      { playerId: 'D', price: 12, timestamp: 1 },
      { playerId: 'E', price: 18, timestamp: 2 },
      { playerId: 'F', price: 25, timestamp: 3 },
    ];
    // A(20) matches D(12), B(15) < E(18) so stop
    const trades = matchAuction(bids, offers);
    expect(trades).toHaveLength(1);
    // 2 remaining bids (B, C), 2 remaining offers (E, F) - equal
  });

  it('handles empty inputs', () => {
    expect(matchAuction([], [])).toHaveLength(0);
    expect(matchAuction([{ playerId: 'A', price: 10, timestamp: 1 }], [])).toHaveLength(0);
    expect(matchAuction([], [{ playerId: 'A', price: 10, timestamp: 1 }])).toHaveLength(0);
  });
});

describe('matchBidAgainstOffers', () => {
  it('matches bid with lowest crossing offer', () => {
    const offers = [
      { playerId: 'X', price: 18, timestamp: 1 },
      { playerId: 'Y', price: 12, timestamp: 2 },
      { playerId: 'Z', price: 15, timestamp: 3 },
    ];
    const result = matchBidAgainstOffers(16, 'A', offers);
    expect(result).toEqual({ buyerId: 'A', sellerId: 'Y', price: 12 });
  });

  it('returns null when no offers cross', () => {
    const offers = [{ playerId: 'X', price: 20, timestamp: 1 }];
    expect(matchBidAgainstOffers(15, 'A', offers)).toBeNull();
  });

  it('excludes self from matching', () => {
    const offers = [{ playerId: 'A', price: 10, timestamp: 1 }];
    expect(matchBidAgainstOffers(15, 'A', offers)).toBeNull();
  });

  it('breaks ties by timestamp', () => {
    const offers = [
      { playerId: 'X', price: 10, timestamp: 200 },
      { playerId: 'Y', price: 10, timestamp: 100 },
    ];
    const result = matchBidAgainstOffers(15, 'A', offers);
    expect(result!.sellerId).toBe('Y');
  });
});

describe('matchOfferAgainstBids', () => {
  it('matches offer with highest crossing bid', () => {
    const bids = [
      { playerId: 'X', price: 10, timestamp: 1 },
      { playerId: 'Y', price: 20, timestamp: 2 },
      { playerId: 'Z', price: 15, timestamp: 3 },
    ];
    const result = matchOfferAgainstBids(18, 'A', bids);
    expect(result).toEqual({ buyerId: 'Y', sellerId: 'A', price: 20 });
  });

  it('returns null when no bids cross', () => {
    const bids = [{ playerId: 'X', price: 5, timestamp: 1 }];
    expect(matchOfferAgainstBids(10, 'A', bids)).toBeNull();
  });

  it('excludes self from matching', () => {
    const bids = [{ playerId: 'A', price: 20, timestamp: 1 }];
    expect(matchOfferAgainstBids(15, 'A', bids)).toBeNull();
  });
});
