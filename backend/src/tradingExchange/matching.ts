/**
 * Order matching algorithms for the Trading Exchange game.
 * Handles both auction (call) matching and continuous trading matching.
 */

/** A single order entry with player, price, and submission time. */
export interface OrderEntry {
  playerId: string;
  price: number;
  timestamp: number;
}

/** Result of matching two orders into a trade. */
export interface MatchResult {
  buyerId: string;
  sellerId: string;
  price: number;
}

/**
 * Run auction matching: pair the highest bid with the lowest offer
 * until no more crosses remain. Trade price is the midpoint.
 * @param bids All auction bid entries.
 * @param offers All auction offer entries.
 * @returns Array of matched trades.
 */
export function matchAuction(
  bids: OrderEntry[],
  offers: OrderEntry[],
): MatchResult[] {
  const sortedBids = [...bids].sort(
    (a, b) => b.price - a.price || a.timestamp - b.timestamp,
  );
  const sortedOffers = [...offers].sort(
    (a, b) => a.price - b.price || a.timestamp - b.timestamp,
  );

  const trades: MatchResult[] = [];
  while (sortedBids.length > 0 && sortedOffers.length > 0) {
    const highestBid = sortedBids[0];
    const lowestOffer = sortedOffers[0];
    if (highestBid.price < lowestOffer.price) break;

    trades.push({
      buyerId: highestBid.playerId,
      sellerId: lowestOffer.playerId,
      price: (highestBid.price + lowestOffer.price) / 2,
    });
    sortedBids.shift();
    sortedOffers.shift();
  }

  return trades;
}

/**
 * Match a new bid against existing passive offers.
 * Trades at the passive offer's price if the bid crosses it.
 * @param bid The new bid price.
 * @param bidderId Player who placed the bid.
 * @param offers All current offer entries (excluding bidder's own).
 * @returns Matched trade, or null if no cross.
 */
export function matchBidAgainstOffers(
  bid: number,
  bidderId: string,
  offers: OrderEntry[],
): MatchResult | null {
  const candidates = offers
    .filter((o) => o.playerId !== bidderId && bid >= o.price)
    .sort((a, b) => a.price - b.price || a.timestamp - b.timestamp);

  if (candidates.length === 0) return null;
  return {
    buyerId: bidderId,
    sellerId: candidates[0].playerId,
    price: candidates[0].price,
  };
}

/**
 * Match a new offer against existing passive bids.
 * Trades at the passive bid's price if the offer crosses it.
 * @param offer The new offer price.
 * @param offererId Player who placed the offer.
 * @param bids All current bid entries (excluding offerer's own).
 * @returns Matched trade, or null if no cross.
 */
export function matchOfferAgainstBids(
  offer: number,
  offererId: string,
  bids: OrderEntry[],
): MatchResult | null {
  const candidates = bids
    .filter((b) => b.playerId !== offererId && offer <= b.price)
    .sort((a, b) => b.price - a.price || a.timestamp - b.timestamp);

  if (candidates.length === 0) return null;
  return {
    buyerId: candidates[0].playerId,
    sellerId: offererId,
    price: candidates[0].price,
  };
}
