import { useRef, useEffect, useState, useMemo } from 'react';
import type { TradingExchangeOrder } from '@lancade/shared';

interface OrderbookLadderProps {
  orders: TradingExchangeOrder[];
  playerColours: Record<string, string>;
  maxValue: number;
}

const VISIBLE_ROWS = 9;
const MIDPOINT_ROW = 4; // 0-indexed, 5th row

/**
 * Vertical orderbook ladder showing bids and offers at each price level.
 * Snaps to midpoint between best bid and best offer unless hovered.
 * @param props Orderbook ladder props.
 * @returns Orderbook ladder element.
 */
export function OrderbookLadder({ orders, playerColours, maxValue }: OrderbookLadderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const { bidsByPrice, offersByPrice, midValue } = useMemo(
    () => buildPriceLevels(orders),
    [orders],
  );

  useEffect(() => {
    if (isHovered || !containerRef.current) return;
    const rowHeight = containerRef.current.scrollHeight / (maxValue + 1);
    const targetRow = maxValue - midValue;
    const scrollTo = rowHeight * targetRow - rowHeight * MIDPOINT_ROW;
    containerRef.current.scrollTop = Math.max(0, scrollTo);
  }, [midValue, maxValue, isHovered]);

  const rows = [];
  for (let price = maxValue; price >= 0; price--) {
    rows.push(
      <LadderRow
        key={price}
        price={price}
        bids={bidsByPrice.get(price) || []}
        offers={offersByPrice.get(price) || []}
        playerColours={playerColours}
      />,
    );
  }

  return (
    <div
      className="te-ladder"
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
      style={{ maxHeight: `${VISIBLE_ROWS * 1.75}rem` }}
    >
      <table className="te-ladder__table">
        <thead>
          <tr>
            <th className="te-ladder__th">Bids</th>
            <th className="te-ladder__th te-ladder__th--price">Value</th>
            <th className="te-ladder__th">Offers</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

interface LadderRowProps {
  price: number;
  bids: { id: string; initial: string }[];
  offers: { id: string; initial: string }[];
  playerColours: Record<string, string>;
}

function LadderRow({ price, bids, offers, playerColours }: LadderRowProps) {
  return (
    <tr className="te-ladder__row">
      <td className="te-ladder__cell te-ladder__cell--bids">
        <InitialsList entries={bids} colours={playerColours} />
      </td>
      <td className="te-ladder__cell te-ladder__cell--price">{price}</td>
      <td className="te-ladder__cell te-ladder__cell--offers">
        <InitialsList entries={offers} colours={playerColours} />
      </td>
    </tr>
  );
}

interface InitialsListProps {
  entries: { id: string; initial: string }[];
  colours: Record<string, string>;
}

function InitialsList({ entries, colours }: InitialsListProps) {
  if (entries.length === 0) return null;
  return (
    <span>
      {entries.map((e, i) => (
        <span key={e.id}>
          {i > 0 && ','}
          <span style={{ color: colours[e.id] || '#888' }}>{e.initial}</span>
        </span>
      ))}
    </span>
  );
}

interface PriceLevels {
  bidsByPrice: Map<number, { id: string; initial: string }[]>;
  offersByPrice: Map<number, { id: string; initial: string }[]>;
  midValue: number;
}

function buildPriceLevels(orders: TradingExchangeOrder[]): PriceLevels {
  const bidsByPrice = new Map<number, { id: string; initial: string }[]>();
  const offersByPrice = new Map<number, { id: string; initial: string }[]>();
  let bestBid = 0;
  let bestOffer = Infinity;

  for (const o of orders) {
    const initial = (o.playerName[0] || '?').toUpperCase();
    if (o.bid !== null) {
      const list = bidsByPrice.get(o.bid) || [];
      list.push({ id: o.playerId, initial });
      bidsByPrice.set(o.bid, list);
      if (o.bid > bestBid) bestBid = o.bid;
    }
    if (o.offer !== null) {
      const list = offersByPrice.get(o.offer) || [];
      list.push({ id: o.playerId, initial });
      offersByPrice.set(o.offer, list);
      if (o.offer < bestOffer) bestOffer = o.offer;
    }
  }

  const mid = bestOffer === Infinity
    ? bestBid
    : Math.round((bestBid + bestOffer) / 2);

  return { bidsByPrice, offersByPrice, midValue: mid };
}
