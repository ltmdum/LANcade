import { useState, useMemo, useCallback } from 'react';
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
import './TradingExchangeGame.css';

/**
 * Main Trading Exchange game component.
 * @param props Standard game component props.
 * @returns Trading exchange game element.
 */
export function TradingExchangeGame(props: GameComponentProps) {
  const { playerId, playerPassword, adminSessionId, isAdmin, setShowConfig } = props;
  const state = props.serverState as TradingExchangeState;
  const ex = state.exchange;

  const isParticipant = ex.participants.includes(playerId);
  const clockSkewMs = Date.now() - state.serverTime;
  const [orderStatus, setOrderStatus] = useState('');

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

  const maxValue = ex.participants.length * ex.cardsPerPlayer * 13;

  const estimateSeed = useMemo(() => {
    const myFirstTrade = liveTrades.find(
      (t) => t.buyerId === playerId || t.sellerId === playerId,
    );
    if (myFirstTrade) return Math.round(myFirstTrade.price);
    let bestBid = -1;
    let bestOffer = Infinity;
    for (const o of ex.orders) {
      if (o.bid !== null && o.bid > bestBid) bestBid = o.bid;
      if (o.offer !== null && o.offer < bestOffer) bestOffer = o.offer;
    }
    if (bestBid >= 0 && bestOffer < Infinity) return Math.round((bestBid + bestOffer) / 2);
    if (bestBid >= 0) return bestBid;
    if (bestOffer < Infinity) return bestOffer;
    return null;
  }, [liveTrades, ex.orders, playerId]);

  const { bidTraded, offerTraded, fallbackBid, fallbackOffer } = useMemo(() => {
    const hasBid = myOrder?.bid !== null && myOrder?.bid !== undefined;
    const hasOffer = myOrder?.offer !== null && myOrder?.offer !== undefined;
    const allTrades = ex.trades;
    const lastBuy = [...allTrades].reverse().find((t) => t.buyerId === playerId);
    const lastSell = [...allTrades].reverse().find((t) => t.sellerId === playerId);
    return {
      bidTraded: !hasBid && lastBuy !== undefined,
      offerTraded: !hasOffer && lastSell !== undefined,
      fallbackBid: lastBuy ? Math.floor(lastBuy.price) : null,
      fallbackOffer: lastSell ? Math.ceil(lastSell.price) : null,
    };
  }, [myOrder, ex.trades, playerId]);

  const handleOrderSubmit = useCallback(async (bid: number, offer: number) => {
    setOrderStatus('');
    try {
      const { response, data } = await gameAction(
        playerId,
        { type: 'submit_orders', bid, offer },
        playerPassword,
      );
      if (!response.ok) setOrderStatus(data.reason || 'Order rejected');
    } catch {
      setOrderStatus('Failed to submit order');
    }
  }, [playerId, playerPassword]);

  const handlePlayAgain = useCallback(async () => {
    if (!adminSessionId) return;
    await startRound(ex.inactivityTimeoutMs, adminSessionId);
  }, [adminSessionId, ex.inactivityTimeoutMs]);

  const handleBackToConfig = useCallback(() => {
    setShowConfig(true);
  }, [setShowConfig]);

  if (ex.state === 'idle') return null;
  if (!isParticipant && !isAdmin) {
    return <p className="te-waiting">Waiting for next game...</p>;
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
      {isParticipant && ex.revealedCardCount > 0 && (
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
          fallbackBid={fallbackBid}
          fallbackOffer={fallbackOffer}
          bidTraded={bidTraded}
          offerTraded={offerTraded}
          status={orderStatus}
        />
      )}
      {ex.state === 'trading' && isParticipant && (
        <TradingSection
          ex={ex}
          playerId={playerId}
          maxValue={maxValue}
          liveTrades={liveTrades}
          myTrades={myTrades}
          myOrder={myOrder}
          bidTraded={bidTraded}
          offerTraded={offerTraded}
          fallbackBid={fallbackBid}
          fallbackOffer={fallbackOffer}
          estimateSeed={estimateSeed}
          onSubmit={handleOrderSubmit}
          orderStatus={orderStatus}
        />
      )}
      {ex.state === 'finished' && (
        <FinishedSection
          ex={ex}
          liveTrades={liveTrades}
          isAdmin={isAdmin}
          onPlayAgain={handlePlayAgain}
          onBackToConfig={handleBackToConfig}
        />
      )}
    </div>
  );
}

interface TradingSectionProps {
  ex: TradingExchangeState['exchange'];
  playerId: string;
  maxValue: number;
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
  ex, playerId, maxValue, liveTrades, myTrades, myOrder,
  bidTraded, offerTraded, fallbackBid, fallbackOffer, estimateSeed, onSubmit, orderStatus,
}: TradingSectionProps) {
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
        <OrderbookLadder orders={ex.orders} playerColours={ex.playerColours} maxValue={maxValue} />
      </div>
      <OrderInput
        onSubmit={onSubmit}
        currentBid={myOrder?.bid ?? null}
        currentOffer={myOrder?.offer ?? null}
        fallbackBid={fallbackBid}
        fallbackOffer={fallbackOffer}
        bidTraded={bidTraded}
        offerTraded={offerTraded}
        status={orderStatus}
      />
    </>
  );
}

interface FinishedSectionProps {
  ex: TradingExchangeState['exchange'];
  liveTrades: import('@lancade/shared').TradingExchangeTrade[];
  isAdmin: boolean;
  onPlayAgain: () => void;
  onBackToConfig: () => void;
}

function FinishedSection({
  ex, liveTrades, isAdmin, onPlayAgain, onBackToConfig,
}: FinishedSectionProps) {
  return (
    <>
      {ex.leaderboard && (
        <Leaderboard
          leaderboard={ex.leaderboard}
          trueValue={ex.trueValue}
          playerColours={ex.playerColours}
        />
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
