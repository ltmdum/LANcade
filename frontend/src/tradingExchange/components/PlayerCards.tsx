import type { Card } from '@lancade/shared';
import { CardTile } from '../../shared/cards/CardTile';
import { InactivityTimer } from './InactivityTimer';

interface PlayerCardsProps {
  cards: Card[];
  /** When provided, shows the countdown timer on the left of this row. */
  roundEndsAt?: number | null;
  clockSkewMs?: number;
}

/**
 * Display the current player's hand as card tiles.
 * When a timer is active, it sits left-aligned with the cards shifted centre-right.
 * @param props Player cards props.
 * @returns Player cards element.
 */
export function PlayerCards({ cards, roundEndsAt, clockSkewMs = 0 }: PlayerCardsProps) {
  if (cards.length === 0) return null;
  const showTimer = roundEndsAt != null;

  return (
    <div className={`te-player-cards ${showTimer ? 'te-player-cards--with-timer' : ''}`}>
      {showTimer && (
        <div className="te-player-cards__timer">
          <InactivityTimer roundEndsAt={roundEndsAt} clockSkewMs={clockSkewMs} />
        </div>
      )}
      <div className="te-player-cards__body">
        <span className="te-player-cards__label">Your Cards</span>
        <div className="te-player-cards__list">
          {cards.map((card, i) => (
            <CardTile key={i} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}
