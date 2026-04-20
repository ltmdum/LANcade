import type { Card } from '@lancade/shared';
import { CardTile, HiddenCardTile } from '../../shared/cards/CardTile';

interface OtherPlayersCardsProps {
  playerCards: Record<string, Card[]>;
  playerColours: Record<string, string>;
  playerNames: Record<string, string>;
  revealedCount: number;
  currentPlayerId: string;
  participants: string[];
}

/**
 * Display other players' cards, revealing only the allowed number.
 * Shows a table with coloured player names on top and their cards below.
 * @param props Other players cards props.
 * @returns Other players cards element.
 */
export function OtherPlayersCards({
  playerCards,
  playerColours,
  playerNames,
  revealedCount,
  currentPlayerId,
  participants,
}: OtherPlayersCardsProps) {
  const others = participants.filter((id) => id !== currentPlayerId);
  if (others.length === 0 || revealedCount === 0) return null;

  return (
    <div className="te-other-cards">
      <div className="te-other-cards__grid">

        {others.map((id) => (
          <OtherPlayerColumn
            key={id}
            cards={playerCards[id] || []}
            colour={playerColours[id] || '#888'}
            name={playerNames[id] || 'Unknown'}
            revealedCount={revealedCount}
          />
        ))}
      </div>
    </div>
  );
}

interface OtherPlayerColumnProps {
  cards: Card[];
  colour: string;
  name: string;
  revealedCount: number;
}

/** A single other player's name and revealed/hidden cards. */
function OtherPlayerColumn({ cards, colour, name, revealedCount }: OtherPlayerColumnProps) {
  const truncated = name.length > 8 ? name.slice(0, 7) + '\u2026' : name;
  return (
    <div className="te-other-cards__col">
      <span className="te-other-cards__name" style={{ color: colour }}>
        {truncated}
      </span>
      <div className="te-other-cards__cards">
        {cards.map((card, i) =>
          i < revealedCount
            ? <CardTile key={i} card={card} />
            : <HiddenCardTile key={i} />,
        )}
      </div>
    </div>
  );
}
