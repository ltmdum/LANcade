import { useRef, useEffect, useState } from 'react';
import type { TradingExchangeTrade } from '@lancade/shared';

interface TradesListProps {
  trades: TradingExchangeTrade[];
  playerColours: Record<string, string>;
  title: string;
  /** If set, highlight buy rows green and sell rows red for this player. */
  highlightPlayerId?: string;
  /** Max visible rows before scrolling. 0 means flex to fill parent. */
  maxRows?: number;
}

/**
 * Scrollable list of trades showing buyer, seller, and price.
 * Snaps to top on new trade unless the user is hovering/touching.
 * @param props Trades list props.
 * @returns Trades list element.
 */
export function TradesList({
  trades,
  playerColours,
  title,
  highlightPlayerId,
  maxRows = 5,
}: TradesListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const prevCountRef = useRef(trades.length);

  useEffect(() => {
    if (isHovered || !containerRef.current) return;
    if (trades.length > prevCountRef.current) {
      containerRef.current.scrollTop = 0;
    }
    prevCountRef.current = trades.length;
  }, [trades.length, isHovered]);

  const reversed = [...trades].reverse();
  const scrollStyle = maxRows > 0 ? { maxHeight: `${maxRows * 1.6}rem` } : undefined;

  return (
    <div className="te-trades-list">
      <div className="te-trades-list__title">{title}</div>
      <div className="te-trades-list__header">
        <span className="te-trades-list__name">Buyer</span>
        <span className="te-trades-list__name">Seller</span>
        <span className="te-trades-list__price">Value</span>
      </div>
      <div
        className="te-trades-list__scroll"
        ref={containerRef}
        style={scrollStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
      >
        {reversed.length === 0 && (
          <div className="te-trades-list__empty">No trades yet</div>
        )}
        {reversed.map((t, i) => (
          <TradeRow
            key={`${t.timestamp}-${i}`}
            trade={t}
            colours={playerColours}
            highlightPlayerId={highlightPlayerId}
          />
        ))}
      </div>
    </div>
  );
}

interface TradeRowProps {
  trade: TradingExchangeTrade;
  colours: Record<string, string>;
  highlightPlayerId?: string;
}

function TradeRow({ trade, colours, highlightPlayerId }: TradeRowProps) {
  let rowClass = 'te-trades-list__row';
  if (highlightPlayerId) {
    if (trade.buyerId === highlightPlayerId) rowClass += ' te-trades-list__row--buy';
    if (trade.sellerId === highlightPlayerId) rowClass += ' te-trades-list__row--sell';
  }

  return (
    <div className={rowClass}>
      <span
        className="te-trades-list__name"
        style={{ color: colours[trade.buyerId] || 'inherit' }}
        title={trade.buyerName}
      >
        {truncate(trade.buyerName, 8)}
      </span>
      <span
        className="te-trades-list__name"
        style={{ color: colours[trade.sellerId] || 'inherit' }}
        title={trade.sellerName}
      >
        {truncate(trade.sellerName, 8)}
      </span>
      <span className="te-trades-list__price">{trade.price}</span>
    </div>
  );
}

function truncate(name: string, max: number): string {
  return name.length > max ? name.slice(0, max - 1) + '\u2026' : name;
}
