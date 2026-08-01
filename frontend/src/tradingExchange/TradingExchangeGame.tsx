import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { TradingExchangeState } from '@lancade/shared';
import type { GameComponentProps } from '../plugins/types';
import { startRound, gameAction } from '../shared/utils/api';
import { PlayAgainPanel } from '../shared/components/PlayAgainPanel';
import { excludeSettlementTrades } from './utils/calculations';
import { PlayerCards } from './components/PlayerCards';
import { OtherPlayersCards } from './components/OtherPlayersCards';
import { PositionTable } from './components/PositionTable';
import { OrderInput } from './components/OrderInput';
import { OrderbookLadder } from './components/OrderbookLadder';
import { TradesList } from './components/TradesList';
import { AuctionPanel } from './components/AuctionPanel';
import { Leaderboard } from './components/Leaderboard';
import { Panel } from '../shared/components/Panel';
import { VolumeNotice } from '../shared/components/VolumeNotice';
import confetti from 'canvas-confetti';
import { playWinSound } from '../shared/utils/sounds';
import { buildWinnerMessage } from '../shared/utils/winnerMessage';
import './TradingExchangeGame.css';

/**
 * Compute an estimate seed based on the first trade price or orderbook midpoint.
 * Returns null if no price information is available.
 */
export function computeEstimateSeed(
  liveTrades: ReturnType<typeof excludeSettlementTrades>,
  orders: TradingExchangeState['exchange']['orders'],
  playerId: string,
): number | null {
  const myFirstTrade = liveTrades.find(
    (t) => t.buyerId === playerId || t.sellerId === playerId,
  );
  if (myFirstTrade) return Math.round(myFirstTrade.price);
  let bestBid = -1;
  let bestOffer = Infinity;
  for (const o of orders) {
    if (o.bid !== null && o.bid > bestBid) bestBid = o.bid;
    if (o.offer !== null && o.offer < bestOffer) bestOffer = o.offer;
  }
  if (bestBid >= 0 && bestOffer < Infinity) return Math.round((bestBid + bestOffer) / 2);
  if (bestBid >= 0) return bestBid;
  if (bestOffer < Infinity) return bestOffer;
  return null;
}

/**
 * Determine whether each side of the order has traded and what fallback
 * prices to use for a player whose order was just executed.
 */
function computeOrderTradingState(
  myOrder: TradingExchangeState['exchange']['orders'][number] | undefined,
  trades: TradingExchangeState['exchange']['trades'],
  playerId: string,
): { bidTraded: boolean; offerTraded: boolean; fallbackBid: number | null; fallbackOffer: number | null } {
  const hasBid = myOrder?.bid !== null && myOrder?.bid !== undefined;
  const hasOffer = myOrder?.offer !== null && myOrder?.offer !== undefined;
  const lastBuy = [...trades].reverse().find((t) => t.buyerId === playerId);
  const lastSell = [...trades].reverse().find((t) => t.sellerId === playerId);
  return {
    bidTraded: !hasBid && lastBuy !== undefined,
    offerTraded: !hasOffer && lastSell !== undefined,
    fallbackBid: lastBuy ? Math.floor(lastBuy.price) : null,
    fallbackOffer: lastSell ? Math.ceil(lastSell.price) : null,
  };
}

/**
 * Main Trading Exchange game component.
 * @param props Standard game component props.
 * @returns Trading exchange game element.
 */
export function TradingExchangeGame(props: GameComponentProps) {
  const { playerId, playerName, accessKey, isAdmin, isParticipating, setShowConfig } = props;
  const state = props.serverState as TradingExchangeState;
  const ex = state.exchange;

  const isParticipant = isParticipating && ex.participants.includes(playerId);
  const clockSkewMs = Date.now() - state.serverTime;
  const [orderStatus, setOrderStatus] = useState('');

  const playedWinRef = useRef(false);

  useEffect(() => {
    playedWinRef.current = false;
  }, [ex.id]);

  useEffect(() => {
    if (
      ex.state === 'finished' &&
      ex.winnerIds.length > 0 &&
      ex.winnerIds.includes(playerId) &&
      !playedWinRef.current
    ) {
      playWinSound();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      confetti({ particleCount: 100, spread: 80, origin: { x: 1, y: 0.6 } });
      playedWinRef.current = true;
    }
  }, [ex.state, ex.winnerIds, playerId]);

  const playerNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of state.players) map[p.id] = p.name;
    return map;
  }, [state.players]);

  const myCards = ex.playerCards[playerId] || [];
  const myOrder = ex.orders.find((o) => o.playerId === playerId);
  const liveTrades = useMemo(() => excludeSettlementTrades(ex.trades), [ex.trades]);
  const myTrades = useMemo(
    () => ex.trades.filter((t) => t.buyerId === playerId || t.sellerId === playerId),
    [ex.trades, playerId],
  );

  const estimateSeed = useMemo(
    () => computeEstimateSeed(liveTrades, ex.orders, playerId),
    [liveTrades, ex.orders, playerId],
  );

  const orderTradingState = useMemo(
    () => computeOrderTradingState(myOrder, ex.trades, playerId),
    [myOrder, ex.trades, playerId],
  );

  const handleOrderSubmit = useCallback(async (bid: number, offer: number) => {
    setOrderStatus('');
    try {
      const { response, data } = await gameAction(
        playerId,
        { type: 'submit_orders', bid, offer },
        accessKey,
      );
      if (!response.ok) setOrderStatus(data.reason || 'Order rejected');
    } catch {
      setOrderStatus('Failed to submit order');
    }
  }, [playerId, accessKey]);

  const handlePlayAgain = useCallback(async () => {
    if (!accessKey) return;
    await startRound(ex.inactivityTimeoutMs, accessKey);
  }, [accessKey, ex.inactivityTimeoutMs]);

  const handleBackToConfig = useCallback(() => {
    setShowConfig(true);
  }, [setShowConfig]);

  if (ex.state === 'idle') {
    return (
      <Panel>
        <VolumeNotice />
      </Panel>
    );
  }
  if (!isParticipant && !isAdmin) {
    return (
      <Panel title="Game in Progress">
        <VolumeNotice />
      </Panel>
    );
  }

  return (
    <div className="te-container">
      {isParticipant && (
        <PlayerCards
          cards={myCards}
          roundEndsAt={ex.state === 'trading' ? ex.roundEndsAt : null}
          clockSkewMs={clockSkewMs}
        />
      )}
      {ex.revealedCardCount > 0 && (
        <OtherPlayersCards
          playerCards={ex.playerCards}
          playerColours={ex.playerColours}
          playerNames={playerNames}
          revealedCount={ex.revealedCardCount}
          currentPlayerId={playerId}
          participants={ex.participants}
        />
      )}
      {ex.state === 'auction' && isParticipant && (
        <AuctionPanel
          hasSubmitted={ex.auctionSubmittedIds.includes(playerId)}
          totalPlayers={ex.participants.length}
          submittedCount={ex.auctionSubmittedIds.length}
          onSubmit={handleOrderSubmit}
          fallbackBid={orderTradingState.fallbackBid}
          fallbackOffer={orderTradingState.fallbackOffer}
          bidTraded={orderTradingState.bidTraded}
          offerTraded={orderTradingState.offerTraded}
          status={orderStatus}
        />
      )}
      {ex.state === 'trading' && isParticipant && (
        <TradingSection
          ex={ex}
          playerId={playerId}
          clockSkewMs={clockSkewMs}
          liveTrades={liveTrades}
          myTrades={myTrades}
          myOrder={myOrder}
          bidTraded={orderTradingState.bidTraded}
          offerTraded={orderTradingState.offerTraded}
          fallbackBid={orderTradingState.fallbackBid}
          fallbackOffer={orderTradingState.fallbackOffer}
          estimateSeed={estimateSeed}
          onSubmit={handleOrderSubmit}
          orderStatus={orderStatus}
        />
      )}
      {ex.state === 'trading' && !isParticipant && (
        <SpectatorTradingSection ex={ex} liveTrades={liveTrades} />
      )}
      {ex.state === 'finished' && (
        <FinishedSection
          ex={ex}
          liveTrades={liveTrades}
          isAdmin={isAdmin}
          currentPlayerName={playerName}
          onPlayAgain={handlePlayAgain}
          onBackToConfig={handleBackToConfig}
        />
      )}
    </div>
  );
}

interface SpectatorTradingSectionProps {
  ex: TradingExchangeState['exchange'];
  liveTrades: import('@lancade/shared').TradingExchangeTrade[];
}

/**
 * View for non-participating admin watching a trading round.
 * Shows market trades and the orderbook ladder but no controls.
 * @param props Spectator section props.
 * @returns Spectator trading section element.
 */
function SpectatorTradingSection({ ex, liveTrades }: SpectatorTradingSectionProps) {
  return (
    <div className="te-trading-area">
      <div className="te-trading-area__lists">
        <TradesList trades={liveTrades} playerColours={ex.playerColours} title="Market Trades" maxRows={0} />
      </div>
      <OrderbookLadder orders={ex.orders} playerColours={ex.playerColours} />
    </div>
  );
}

interface TradingSectionProps {
  ex: TradingExchangeState['exchange'];
  playerId: string;
  clockSkewMs: number;
  liveTrades: import('@lancade/shared').TradingExchangeTrade[];
  myTrades: import('@lancade/shared').TradingExchangeTrade[];
  myOrder: import('@lancade/shared').TradingExchangeOrder | undefined;
  bidTraded: boolean;
  offerTraded: boolean;
  fallbackBid: number | null;
  fallbackOffer: number | null;
  estimateSeed: number | null;
  onSubmit: (bid: number, offer: number) => void;
  orderStatus: string;
}

function TradingSection({
  ex, playerId, clockSkewMs, liveTrades, myTrades, myOrder,
  bidTraded, offerTraded, fallbackBid, fallbackOffer, estimateSeed, onSubmit, orderStatus,
}: TradingSectionProps) {
  const myAutoSubmitEndsAt = ex.autoSubmitEndsAt[playerId] ?? null;
  return (
    <>
      <PositionTable trades={ex.trades} playerId={playerId} estimateSeed={estimateSeed} />
      <div className="te-trading-area">
        <div className="te-trading-area__lists">
          <TradesList trades={liveTrades} playerColours={ex.playerColours} title="Market Trades" maxRows={0} />
          <TradesList
            trades={myTrades}
            playerColours={ex.playerColours}
            title="My Trades"
            highlightPlayerId={playerId}
            maxRows={0}
          />
        </div>
        <OrderbookLadder orders={ex.orders} playerColours={ex.playerColours} />
      </div>
      <OrderInput
        onSubmit={onSubmit}
        currentBid={myOrder?.bid ?? null}
        currentOffer={myOrder?.offer ?? null}
        fallbackBid={fallbackBid}
        fallbackOffer={fallbackOffer}
        bidTraded={bidTraded}
        offerTraded={offerTraded}
        autoSubmitEndsAt={myAutoSubmitEndsAt}
        clockSkewMs={clockSkewMs}
        status={orderStatus}
      />
    </>
  );
}

interface FinishedSectionProps {
  ex: TradingExchangeState['exchange'];
  liveTrades: import('@lancade/shared').TradingExchangeTrade[];
  isAdmin: boolean;
  currentPlayerName: string;
  onPlayAgain: () => void;
  onBackToConfig: () => void;
}

function FinishedSection({
  ex, liveTrades, isAdmin, currentPlayerName, onPlayAgain, onBackToConfig,
}: FinishedSectionProps) {
  return (
    <>
      {ex.leaderboard && (
        <>
          <div className="game-result-winner">
            {buildWinnerMessage(ex.winnerNames, currentPlayerName || null)}
          </div>
          <Leaderboard
            leaderboard={ex.leaderboard}
            winnerIds={ex.winnerIds}
            trueValue={ex.trueValue}
            playerColours={ex.playerColours}
          />
        </>
      )}
      <TradesList trades={liveTrades} playerColours={ex.playerColours} title="Market Trades" />
      {isAdmin && (
        <PlayAgainPanel
          onPlayAgain={onPlayAgain}
          onBackToConfig={onBackToConfig}
          playAgainText="Play Again (Same Settings)"
          title="Next Game"
        />
      )}
    </>
  );
}
