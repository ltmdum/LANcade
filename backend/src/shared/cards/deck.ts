import crypto from 'crypto';
import { SUITS, RANKS, RANK_VALUES, type Card } from '@lancade/shared';

/**
 * Create a standard 52-card deck.
 * @returns Array of 52 cards.
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: RANK_VALUES[rank] });
    }
  }
  return deck;
}

/**
 * Fisher-Yates shuffle using crypto-secure randomness.
 * Mutates and returns the array.
 * @param array Array to shuffle in place.
 * @returns The shuffled array.
 */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const bytes = crypto.randomBytes(4);
    const j = bytes.readUInt32BE(0) % (i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Deal cards from a deck to a set of player IDs.
 * @param deck Deck to deal from (mutated — cards are removed).
 * @param playerIds Players to deal to.
 * @param cardsPerPlayer Number of cards each player receives.
 * @returns Map of playerId to their dealt cards.
 */
export function dealCards(
  deck: Card[],
  playerIds: string[],
  cardsPerPlayer: number,
): Map<string, Card[]> {
  const hands = new Map<string, Card[]>();
  for (const id of playerIds) {
    hands.set(id, deck.splice(0, cardsPerPlayer));
  }
  return hands;
}
