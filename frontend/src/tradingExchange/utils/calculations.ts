import type { TradingExchangeTrade } from '@lancade/shared';

const EXCHANGE_ID = '__exchange__';

interface TradeEntry {
  price: number;
  side: 'buy' | 'sell';
}

/**
 * Extract a player's trades from the full trade list.
 * @param trades All trades.
 * @param playerId Player to filter for.
 * @returns Array of trade entries with side.
 */
export function getPlayerTrades(
  trades: TradingExchangeTrade[],
  playerId: string,
): TradeEntry[] {
  const result: TradeEntry[] = [];
  for (const t of trades) {
    if (t.buyerId === playerId) result.push({ price: t.price, side: 'buy' });
    if (t.sellerId === playerId) result.push({ price: t.price, side: 'sell' });
  }
  return result;
}

/**
 * Compute a player's net position from trades (positive = long).
 * @param trades All trades.
 * @param playerId Player to compute for.
 * @returns Net position.
 */
export function computePosition(
  trades: TradingExchangeTrade[],
  playerId: string,
): number {
  let pos = 0;
  for (const t of trades) {
    if (t.buyerId === EXCHANGE_ID || t.sellerId === EXCHANGE_ID) continue;
    if (t.buyerId === playerId) pos += 1;
    if (t.sellerId === playerId) pos -= 1;
  }
  return pos;
}

/**
 * Compute realized P&L by pairing lowest buys with highest sells.
 * @param playerTrades Player's trade entries (excluding settlement).
 * @returns Realized P&L value.
 */
export function computeRealizedPnl(playerTrades: TradeEntry[]): number {
  const buys = playerTrades
    .filter((t) => t.side === 'buy')
    .map((t) => t.price)
    .sort((a, b) => a - b);
  const sells = playerTrades
    .filter((t) => t.side === 'sell')
    .map((t) => t.price)
    .sort((a, b) => b - a);

  let pnl = 0;
  const pairs = Math.min(buys.length, sells.length);
  for (let i = 0; i < pairs; i++) {
    pnl += sells[i] - buys[i];
  }
  return pnl;
}

/**
 * Compute the average price of the outstanding (unpaired) position.
 * Uses lowest buys paired with highest sells; remaining side is outstanding.
 * @param playerTrades Player's trade entries (excluding settlement).
 * @returns Average price or null if position is flat.
 */
export function computeAverageOutstandingPrice(
  playerTrades: TradeEntry[],
): number | null {
  const buys = playerTrades
    .filter((t) => t.side === 'buy')
    .map((t) => t.price)
    .sort((a, b) => a - b);
  const sells = playerTrades
    .filter((t) => t.side === 'sell')
    .map((t) => t.price)
    .sort((a, b) => b - a);

  const pairs = Math.min(buys.length, sells.length);
  if (buys.length > sells.length) {
    const outstanding = buys.slice(pairs);
    return outstanding.reduce((s, p) => s + p, 0) / outstanding.length;
  }
  if (sells.length > buys.length) {
    const outstanding = sells.slice(pairs);
    return outstanding.reduce((s, p) => s + p, 0) / outstanding.length;
  }
  return null;
}

/**
 * Compute the estimated total P&L given a player's estimate of final value.
 * Realized P&L + unrealized P&L at the estimate price.
 * @param playerTrades Player's trade entries (excluding settlement).
 * @param estimate Player's estimate of the final sum.
 * @returns Estimated total P&L.
 */
export function computePnlEstimate(
  playerTrades: TradeEntry[],
  estimate: number,
): number {
  const buys = playerTrades
    .filter((t) => t.side === 'buy')
    .map((t) => t.price)
    .sort((a, b) => a - b);
  const sells = playerTrades
    .filter((t) => t.side === 'sell')
    .map((t) => t.price)
    .sort((a, b) => b - a);

  let totalPnl = 0;
  const pairs = Math.min(buys.length, sells.length);
  for (let i = 0; i < pairs; i++) {
    totalPnl += sells[i] - buys[i];
  }
  // Unrealized: remaining buys are long (settle at estimate)
  for (let i = pairs; i < buys.length; i++) {
    totalPnl += estimate - buys[i];
  }
  // Unrealized: remaining sells are short (settle at estimate)
  for (let i = pairs; i < sells.length; i++) {
    totalPnl += sells[i] - estimate;
  }
  return totalPnl;
}

/**
 * Filter trades to exclude settlement trades (against the exchange).
 * @param trades Full trade list.
 * @returns Trades between real players only.
 */
export function excludeSettlementTrades(
  trades: TradingExchangeTrade[],
): TradingExchangeTrade[] {
  return trades.filter(
    (t) => t.buyerId !== EXCHANGE_ID && t.sellerId !== EXCHANGE_ID,
  );
}
