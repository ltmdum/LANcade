import { useMemo } from 'react';
import type { TradingExchangeOrder } from '@lancade/shared';

interface OrderbookLadderProps {
  orders: TradingExchangeOrder[];
  playerColours: Record<string, string>;
}

const MAX_HEIGHT_REM = 9 * 1.75;

/**
 * Orderbook ladder showing only price levels where orders exist.
 * Grows to fit content, then becomes scrollable at max height.
 * @param props Orderbook ladder props.
 * @returns Orderbook ladder element.
 */
export function OrderbookLadder({ orders, playerColours }: OrderbookLadderProps) {
  const { bidsByPrice, offersByPrice, priceLevels } = useMemo(
    () => buildPriceLevels(orders),
    [orders],
  );

  return (
    <div className="te-ladder" style={{ maxHeight: `${MAX_HEIGHT_REM}rem` }}>
      <table className="te-ladder__table">
        <thead>
          <tr>
            <th className="te-ladder__th">Bids</th>
            <th className="te-ladder__th te-ladder__th--price">Value</th>
            <th className="te-ladder__th">Offers</th>
          </tr>
        </thead>
        <tbody>
          {priceLevels.length === 0 && (
            <tr><td colSpan={3} className="te-ladder__empty">No orders</td></tr>
          )}
          {priceLevels.map((price) => (
            <LadderRow
              key={price}
              price={price}
              bids={bidsByPrice.get(price) || []}
              offers={offersByPrice.get(price) || []}
              playerColours={playerColours}
            />
          ))}
        </tbody>
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
  priceLevels: number[];
}

/** Build price level data, returning only levels with at least one order. */
function buildPriceLevels(orders: TradingExchangeOrder[]): PriceLevels {
  const bidsByPrice = new Map<number, { id: string; initial: string }[]>();
  const offersByPrice = new Map<number, { id: string; initial: string }[]>();
  const priceSet = new Set<number>();

  for (const o of orders) {
    const initial = (o.playerName[0] || '?').toUpperCase();
    if (o.bid !== null) {
      const list = bidsByPrice.get(o.bid) || [];
      list.push({ id: o.playerId, initial });
      bidsByPrice.set(o.bid, list);
      priceSet.add(o.bid);
    }
    if (o.offer !== null) {
      const list = offersByPrice.get(o.offer) || [];
      list.push({ id: o.playerId, initial });
      offersByPrice.set(o.offer, list);
      priceSet.add(o.offer);
    }
  }

  const priceLevels = Array.from(priceSet).sort((a, b) => b - a);
  return { bidsByPrice, offersByPrice, priceLevels };
}
