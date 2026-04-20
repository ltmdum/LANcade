import type { Card } from '@lancade/shared';
import { SUIT_SYMBOLS, isSuitRed } from '@lancade/shared';
import './CardTile.css';

interface CardTileProps {
  card: Card;
  /** Additional CSS class. */
  className?: string;
}

/**
 * Display a playing card as a compact tile with rank and suit symbol.
 * Suit symbol is coloured red for hearts/diamonds, dark for clubs/spades.
 * @param props Card tile props.
 * @returns Card tile element.
 */
export function CardTile({ card, className = '' }: CardTileProps) {
  const symbol = SUIT_SYMBOLS[card.suit];
  const colourClass = isSuitRed(card.suit) ? 'card-tile--red' : 'card-tile--black';
  return (
    <span className={`card-tile ${colourClass} ${className}`}>
      {card.rank}{symbol}
    </span>
  );
}

interface HiddenCardTileProps {
  className?: string;
}

/**
 * Display a face-down card placeholder.
 * @param props Hidden card tile props.
 * @returns Hidden card tile element.
 */
export function HiddenCardTile({ className = '' }: HiddenCardTileProps) {
  return <span className={`card-tile card-tile--hidden ${className}`}>?</span>;
}
