import type {
  TradingExchangeState,
  TradingExchangeOrder,
  TradingExchangeTrade,
  TradingExchangeLeaderboardEntry,
  Card,
} from '@lancade/shared';
import { createGameBase } from '../shared/stores/game-base.js';
import { PlayerStore } from '../shared/stores/player-store.js';
import { createDeck, shuffle, dealCards } from '../shared/cards/deck.js';
import {
  matchAuction,
  matchBidAgainstOffers,
  matchOfferAgainstBids,
  type OrderEntry,
} from './matching.js';

const PLAYER_COLOURS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8A5C',
  '#6C5CE7', '#00CEC9', '#FD79A8', '#55A3FF', '#FFEAA7',
  '#DFE6E9', '#00B894',
];

const EXCHANGE_ID = '__exchange__';
const EXCHANGE_NAME = 'Exchange';

const DEFAULT_CARDS_PER_PLAYER = 2;
const DEFAULT_AUTO_SUBMIT_MS = 0; // 0 = disabled

/** Internal order stored per player. */
interface InternalOrder {
  bid: number | null;
  offer: number | null;
  bidTs: number;
  offerTs: number;
}

/** Internal trade record. */
interface InternalTrade {
  buyerId: string;
  sellerId: string;
  price: number;
  timestamp: number;
}

/** Internal match state. */
interface Match {
  id: number;
  state: 'idle' | 'auction' | 'trading' | 'finished';
  cardsPerPlayer: number;
  inactivityTimeoutMs: number;
  autoSubmitMs: number;
  playerCards: Map<string, Card[]>;
  revealedCardCount: number;
  currentRound: number;
  totalRounds: number;
  orders: Map<string, InternalOrder>;
  trades: InternalTrade[];
  roundEndsAt: number | null;
  autoSubmitEndsAt: Map<string, number>;
  playerColours: Map<string, string>;
  participants: string[];
  auctionSubmittedIds: Set<string>;
  winnerIds: string[];
  leaderboard: TradingExchangeLeaderboardEntry[] | null;
  trueValue: number;
}

export interface TradingExchangeGameOptions {
  onStateChange?: () => void;
  playerStore?: PlayerStore;
}

/** Create an empty match in idle state. */
function createEmptyMatch(): Match {
  return {
    id: 0,
    state: 'idle',
    cardsPerPlayer: 2,
    inactivityTimeoutMs: 30000,
    autoSubmitMs: 0,
    playerCards: new Map(),
    revealedCardCount: 0,
    currentRound: 0,
    totalRounds: 0,
    orders: new Map(),
    trades: [],
    roundEndsAt: null,
    autoSubmitEndsAt: new Map(),
    playerColours: new Map(),
    participants: [],
    auctionSubmittedIds: new Set(),
    winnerIds: [],
    leaderboard: null,
    trueValue: 0,
  };
}

/**
 * Create a Trading Exchange game instance.
 * @param options Game creation options.
 * @returns Game instance implementing required interface.
 */
export function createGame(options: TradingExchangeGameOptions = {}) {
  const onStateChange = options.onStateChange || (() => {});
  let match = createEmptyMatch();
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  const autoSubmitTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let cardsPerPlayer = DEFAULT_CARDS_PER_PLAYER;
  let autoSubmitMs = DEFAULT_AUTO_SUBMIT_MS;

  const { playerStore, buildBaseState } = createGameBase({
    categories: [],
    onChange: () => onStateChange(),
    canChange: () => match.state === 'idle',
    playerStore: options.playerStore,
  });

  /** Broadcast state to all clients. */
  function notifyChange(): void {
    onStateChange();
  }

  /** Clear any active inactivity timer. */
  function clearInactivityTimer(): void {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
  }

  /** Clear a single player's auto-submit timer. */
  function clearAutoSubmitTimer(playerId: string): void {
    const timer = autoSubmitTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      autoSubmitTimers.delete(playerId);
    }
    match.autoSubmitEndsAt.delete(playerId);
  }

  /** Clear all auto-submit timers. */
  function clearAllAutoSubmitTimers(): void {
    for (const timer of autoSubmitTimers.values()) clearTimeout(timer);
    autoSubmitTimers.clear();
    match.autoSubmitEndsAt.clear();
  }

  /** Start an auto-submit timer for a player whose order just traded. */
  function startAutoSubmitTimer(playerId: string): void {
    if (match.autoSubmitMs <= 0 || match.state !== 'trading') return;
    clearAutoSubmitTimer(playerId);
    const now = Date.now();
    match.autoSubmitEndsAt.set(playerId, now + match.autoSubmitMs);
    autoSubmitTimers.set(playerId, setTimeout(() => {
      handleAutoSubmit(playerId);
    }, match.autoSubmitMs));
  }

  /** Start auto-submit timers for any player with a traded side (post-auction). */
  function startAutoSubmitForTradedPlayers(): void {
    for (const [playerId, order] of match.orders) {
      if (order.bid === null || order.offer === null) {
        startAutoSubmitTimer(playerId);
      }
    }
  }

  /** Auto-submit a player's current input values. */
  function handleAutoSubmit(playerId: string): void {
    clearAutoSubmitTimer(playerId);
    if (match.state !== 'trading') return;
    const order = match.orders.get(playerId);
    if (!order) return;
    const needsBid = order.bid === null;
    const needsOffer = order.offer === null;
    if (!needsBid && !needsOffer) return;
    // Re-submit at whatever values are currently set (the non-null sides)
    // Use the last trade price as fallback for the traded side
    const bid = order.bid ?? findLastTradePrice(playerId, 'buy');
    const offer = order.offer ?? findLastTradePrice(playerId, 'sell');
    if (bid === null || offer === null || bid >= offer) return;
    handleContinuousSubmission(playerId, bid, offer);
  }

  /** Find the last trade price for a player on a given side. */
  function findLastTradePrice(playerId: string, side: 'buy' | 'sell'): number | null {
    for (let i = match.trades.length - 1; i >= 0; i--) {
      const t = match.trades[i];
      if (side === 'buy' && t.buyerId === playerId) return Math.floor(t.price);
      if (side === 'sell' && t.sellerId === playerId) return Math.ceil(t.price);
    }
    return null;
  }

  /** Assign a colour to each player from the palette. */
  function assignColours(playerIds: string[]): Map<string, string> {
    const colours = new Map<string, string>();
    playerIds.forEach((id, i) => {
      colours.set(id, PLAYER_COLOURS[i % PLAYER_COLOURS.length]);
    });
    return colours;
  }

  /** Calculate the sum of all dealt cards. */
  function calculateTrueValue(cards: Map<string, Card[]>): number {
    let total = 0;
    for (const hand of cards.values()) {
      for (const card of hand) total += card.value;
    }
    return total;
  }

  /** Extract bid entries from the order map (non-null bids only). */
  function getBidEntries(): OrderEntry[] {
    const entries: OrderEntry[] = [];
    for (const [playerId, order] of match.orders) {
      if (order.bid !== null) {
        entries.push({ playerId, price: order.bid, timestamp: order.bidTs });
      }
    }
    return entries;
  }

  /** Extract offer entries from the order map (non-null offers only). */
  function getOfferEntries(): OrderEntry[] {
    const entries: OrderEntry[] = [];
    for (const [playerId, order] of match.orders) {
      if (order.offer !== null) {
        entries.push({ playerId, price: order.offer, timestamp: order.offerTs });
      }
    }
    return entries;
  }

  /** Record a trade and update affected orders. Starts auto-submit timers. */
  function recordTrade(buyerId: string, sellerId: string, price: number): void {
    match.trades.push({
      buyerId,
      sellerId,
      price,
      timestamp: Date.now(),
    });
    const buyerOrder = match.orders.get(buyerId);
    if (buyerOrder) {
      buyerOrder.bid = null;
      startAutoSubmitTimer(buyerId);
    }
    const sellerOrder = match.orders.get(sellerId);
    if (sellerOrder) {
      sellerOrder.offer = null;
      startAutoSubmitTimer(sellerId);
    }
  }

  /** Process an auction bid/offer submission from a player. */
  function handleAuctionSubmission(
    playerId: string,
    bid: number,
    offer: number,
  ): { ok: boolean; reason?: string } {
    if (match.state !== 'auction') return { ok: false, reason: 'not_auction' };
    if (!match.participants.includes(playerId)) {
      return { ok: false, reason: 'not_participant' };
    }

    const now = Date.now();
    match.orders.set(playerId, { bid, offer, bidTs: now, offerTs: now });
    match.auctionSubmittedIds.add(playerId);

    if (match.auctionSubmittedIds.size >= match.participants.length) {
      runAuctionMatching();
      startTradingRound();
      startAutoSubmitForTradedPlayers();
    }

    notifyChange();
    return { ok: true };
  }

  /** Execute auction matching and transition to trading. */
  function runAuctionMatching(): void {
    const bids = getBidEntries();
    const offers = getOfferEntries();
    const trades = matchAuction(bids, offers);
    for (const t of trades) {
      recordTrade(t.buyerId, t.sellerId, t.price);
    }
  }

  /** Begin a new continuous trading round with the inactivity timer. */
  function startTradingRound(): void {
    match.state = 'trading';
    match.currentRound += 1;
    if (match.currentRound > 1) {
      match.revealedCardCount = Math.min(
        match.currentRound - 1,
        match.cardsPerPlayer,
      );
    }
    resetInactivityTimer();
  }

  /** Reset the inactivity timer to its full duration. */
  function resetInactivityTimer(): void {
    clearInactivityTimer();
    const now = Date.now();
    match.roundEndsAt = now + match.inactivityTimeoutMs;
    inactivityTimer = setTimeout(handleRoundTimeout, match.inactivityTimeoutMs);
  }

  /** Handle inactivity timer expiration — advance round or finish. */
  function handleRoundTimeout(): void {
    if (match.state !== 'trading') return;
    clearInactivityTimer();
    match.roundEndsAt = null;

    if (match.currentRound >= match.totalRounds) {
      finishGame();
    } else {
      startTradingRound();
      notifyChange();
    }
  }

  /** Process a continuous trading bid/offer submission. */
  function handleContinuousSubmission(
    playerId: string,
    bid: number,
    offer: number,
  ): { ok: boolean; reason?: string } {
    if (match.state !== 'trading') return { ok: false, reason: 'not_trading' };
    if (!match.participants.includes(playerId)) {
      return { ok: false, reason: 'not_participant' };
    }

    clearAutoSubmitTimer(playerId);
    const now = Date.now();
    match.orders.set(playerId, { bid, offer, bidTs: now, offerTs: now });

    let traded = false;
    traded = tryMatchBid(playerId, bid) || traded;
    traded = tryMatchOffer(playerId, offer) || traded;

    if (traded) resetInactivityTimer();
    notifyChange();
    return { ok: true };
  }

  /** Try to match a player's bid against existing offers. */
  function tryMatchBid(playerId: string, bid: number): boolean {
    const offers = getOfferEntries().filter((o) => o.playerId !== playerId);
    const result = matchBidAgainstOffers(bid, playerId, offers);
    if (!result) return false;
    recordTrade(result.buyerId, result.sellerId, result.price);
    return true;
  }

  /** Try to match a player's offer against existing bids. */
  function tryMatchOffer(playerId: string, offer: number): boolean {
    const bids = getBidEntries().filter((b) => b.playerId !== playerId);
    const result = matchOfferAgainstBids(offer, playerId, bids);
    if (!result) return false;
    recordTrade(result.buyerId, result.sellerId, result.price);
    return true;
  }

  /** Settle all outstanding positions at true value and compute leaderboard. */
  function finishGame(): void {
    clearInactivityTimer();
    clearAllAutoSubmitTimers();
    match.state = 'finished';
    match.roundEndsAt = null;
    match.revealedCardCount = match.cardsPerPlayer;
    settlePositions();
    match.leaderboard = calculateLeaderboard();
    if (match.leaderboard.length > 0) {
      const topPnl = match.leaderboard[0].pnl;
      match.winnerIds = match.leaderboard
        .filter((e) => e.pnl === topPnl)
        .map((e) => e.playerId);
    } else {
      match.winnerIds = [];
    }
    notifyChange();
  }

  /** Create settlement trades for any outstanding positions. */
  function settlePositions(): void {
    const positions = computeNetPositions();
    const now = Date.now();
    for (const [playerId, pos] of positions) {
      if (pos > 0) {
        for (let i = 0; i < pos; i++) {
          match.trades.push({
            buyerId: EXCHANGE_ID,
            sellerId: playerId,
            price: match.trueValue,
            timestamp: now,
          });
        }
      } else if (pos < 0) {
        for (let i = 0; i < -pos; i++) {
          match.trades.push({
            buyerId: playerId,
            sellerId: EXCHANGE_ID,
            price: match.trueValue,
            timestamp: now,
          });
        }
      }
    }
  }

  /** Compute net position per player from trades (positive = long). */
  function computeNetPositions(): Map<string, number> {
    const positions = new Map<string, number>();
    for (const id of match.participants) positions.set(id, 0);
    for (const trade of match.trades) {
      if (trade.buyerId !== EXCHANGE_ID) {
        positions.set(trade.buyerId, (positions.get(trade.buyerId) || 0) + 1);
      }
      if (trade.sellerId !== EXCHANGE_ID) {
        positions.set(trade.sellerId, (positions.get(trade.sellerId) || 0) - 1);
      }
    }
    return positions;
  }

  /** Calculate final P&L per player and return sorted leaderboard. */
  function calculateLeaderboard(): TradingExchangeLeaderboardEntry[] {
    const pnl = new Map<string, number>();
    for (const id of match.participants) pnl.set(id, 0);

    for (const trade of match.trades) {
      if (trade.buyerId !== EXCHANGE_ID) {
        pnl.set(trade.buyerId, (pnl.get(trade.buyerId) || 0) - trade.price);
      }
      if (trade.sellerId !== EXCHANGE_ID) {
        pnl.set(trade.sellerId, (pnl.get(trade.sellerId) || 0) + trade.price);
      }
    }

    return match.participants
      .map((id) => ({
        playerId: id,
        playerName: playerStore.getPlayerName(id),
        pnl: pnl.get(id) || 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }

  /** Build the trade for broadcast with player names. */
  function buildTrade(t: InternalTrade): TradingExchangeTrade {
    return {
      buyerId: t.buyerId,
      buyerName: t.buyerId === EXCHANGE_ID
        ? EXCHANGE_NAME
        : playerStore.getPlayerName(t.buyerId),
      sellerId: t.sellerId,
      sellerName: t.sellerId === EXCHANGE_ID
        ? EXCHANGE_NAME
        : playerStore.getPlayerName(t.sellerId),
      price: t.price,
      timestamp: t.timestamp,
    };
  }

  /** Build the orders list for broadcast with player names. */
  function buildOrders(): TradingExchangeOrder[] {
    return match.participants.map((id) => {
      const order = match.orders.get(id);
      return {
        playerId: id,
        playerName: playerStore.getPlayerName(id),
        bid: order?.bid ?? null,
        offer: order?.offer ?? null,
      };
    });
  }

  /** Build the player cards map for broadcast. */
  function buildPlayerCards(): Record<string, Card[]> {
    const result: Record<string, Card[]> = {};
    for (const [id, cards] of match.playerCards) {
      result[id] = cards;
    }
    return result;
  }

  /** Build the player colours map for broadcast. */
  function buildPlayerColours(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [id, colour] of match.playerColours) {
      result[id] = colour;
    }
    return result;
  }

  /** Build the full public state for broadcasting. */
  function getState(): Omit<TradingExchangeState, 'game' | 'games'> {
    return {
      ...buildBaseState(),
      gameSettings: { cardsPerPlayer, autoSubmitMs },
      exchange: {
        id: match.id,
        state: match.state,
        cardsPerPlayer: match.cardsPerPlayer,
        inactivityTimeoutMs: match.inactivityTimeoutMs,
        autoSubmitMs: match.autoSubmitMs,
        playerCards: buildPlayerCards(),
        revealedCardCount: match.revealedCardCount,
        currentRound: match.currentRound,
        totalRounds: match.totalRounds,
        orders: buildOrders(),
        trades: match.trades.map(buildTrade),
        roundEndsAt: match.roundEndsAt,
        autoSubmitEndsAt: Object.fromEntries(match.autoSubmitEndsAt),
        playerColours: buildPlayerColours(),
        participants: match.participants.slice(),
        auctionSubmittedIds: Array.from(match.auctionSubmittedIds),
        winnerIds: match.winnerIds,
        winnerNames: match.winnerIds.map((id) => playerStore.getPlayerName(id)),
        leaderboard: match.leaderboard,
        trueValue: match.state === 'finished' ? match.trueValue : null,
      },
    };
  }

  /** Join a player and broadcast. */
  function joinPlayer(payload: { name?: string; playerId?: string }) {
    const result = playerStore.joinPlayer(payload);
    if (result.ok) notifyChange();
    return result;
  }

  /**
   * Start the game: deal cards and enter auction phase.
   * @param durationMs Inactivity timeout for trading rounds.
   */
  function startRound(durationMs: number) {
    if (match.state === 'auction' || match.state === 'trading') {
      return { ok: false, reason: 'round_active' };
    }
    const playerIds = playerStore.getPlayerIds();
    if (playerIds.length < 2) return { ok: false, reason: 'need_2_players' };

    const deck = shuffle(createDeck());
    const totalNeeded = playerIds.length * cardsPerPlayer;
    if (totalNeeded > deck.length) {
      return { ok: false, reason: 'too_many_cards' };
    }

    const hands = dealCards(deck, playerIds, cardsPerPlayer);

    match = {
      id: match.id + 1,
      state: 'auction',
      cardsPerPlayer,
      inactivityTimeoutMs: durationMs,
      autoSubmitMs: autoSubmitMs,
      playerCards: hands,
      revealedCardCount: 0,
      currentRound: 0,
      totalRounds: cardsPerPlayer + 1,
      orders: new Map(),
      trades: [],
      roundEndsAt: null,
      autoSubmitEndsAt: new Map(),
      playerColours: assignColours(playerIds),
      participants: playerIds,
      auctionSubmittedIds: new Set(),
      winnerIds: [],
      leaderboard: null,
      trueValue: calculateTrueValue(hands),
    };

    notifyChange();
    return { ok: true, matchId: match.id };
  }

  /** Not used for this game. */
  function submitVotes(): { ok: boolean; reason?: string } {
    return { ok: false, reason: 'not_supported' };
  }

  /** Not used for this game. */
  function submitWord(): { ok: boolean; reason?: string } {
    return { ok: false, reason: 'not_supported' };
  }

  /**
   * Handle a game-specific action from a player.
   * Supports: { type: 'submit_orders', bid: number, offer: number }
   */
  function handleAction(playerId: string, action: unknown) {
    const data = action as { type?: string; bid?: number; offer?: number } | null;
    if (!data || data.type !== 'submit_orders') {
      return { ok: false, reason: 'unknown_action' };
    }
    if (typeof data.bid !== 'number' || typeof data.offer !== 'number') {
      return { ok: false, reason: 'invalid_payload' };
    }
    const bid = Math.floor(data.bid);
    const offer = Math.floor(data.offer);
    if (bid < 0 || offer < 0) return { ok: false, reason: 'negative_value' };
    if (bid >= offer) return { ok: false, reason: 'bid_must_be_less_than_offer' };

    if (match.state === 'auction') {
      return handleAuctionSubmission(playerId, bid, offer);
    }
    return handleContinuousSubmission(playerId, bid, offer);
  }

  /** Update admin-configurable settings (only when idle). */
  function updateSettings(settings: Record<string, unknown>) {
    if (match.state === 'auction' || match.state === 'trading') {
      return { ok: false, reason: 'game_active' };
    }
    let changed = false;
    for (const key of Object.keys(settings)) {
      const val = settings[key];
      if (key === 'cardsPerPlayer') {
        if (typeof val !== 'number' || !Number.isInteger(val) || val < 1 || val > 13) {
          return { ok: false, reason: 'invalid_value' };
        }
        cardsPerPlayer = val;
        changed = true;
      } else if (key === 'autoSubmitMs') {
        if (typeof val !== 'number' || !Number.isInteger(val) || val < 0 || val > 60000) {
          return { ok: false, reason: 'invalid_value' };
        }
        autoSubmitMs = val;
        changed = true;
      } else {
        return { ok: false, reason: 'unknown_setting' };
      }
    }
    if (changed) notifyChange();
    return { ok: true };
  }

  /** Get the current game phase. */
  function getPhase(): string {
    return match.state;
  }

  /** End the game early. */
  function endGame() {
    if (match.state === 'idle' || match.state === 'finished') {
      return { ok: false, reason: 'not_active' };
    }
    clearInactivityTimer();
    clearAllAutoSubmitTimers();
    match = createEmptyMatch();
    notifyChange();
    return { ok: true };
  }

  /** Clean up all timers. */
  function dispose(): void {
    clearInactivityTimer();
    clearAllAutoSubmitTimers();
  }

  return {
    getPhase,
    getState,
    startRound,
    submitWord,
    submitVotes,
    joinPlayer,
    handleAction,
    updateSettings,
    endGame,
    dispose,
  };
}
