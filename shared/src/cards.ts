/** Suits in a standard 52-card deck. */
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

/** Ranks in a standard 52-card deck. */
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

/** A single playing card with its suit, rank, and numeric value. */
export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
}

/** All four suits. */
export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

/** All thirteen ranks in order. */
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** Map from rank to numeric value (A=1, J=11, Q=12, K=13). */
export const RANK_VALUES: Record<Rank, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
};

/** Suit display symbols. */
export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

/** Whether a suit is red (hearts/diamonds) or black (clubs/spades). */
export function isSuitRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}
