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
export declare const SUITS: Suit[];
/** All thirteen ranks in order. */
export declare const RANKS: Rank[];
/** Map from rank to numeric value (A=1, J=11, Q=12, K=13). */
export declare const RANK_VALUES: Record<Rank, number>;
/** Suit display symbols. */
export declare const SUIT_SYMBOLS: Record<Suit, string>;
/** Whether a suit is red (hearts/diamonds) or black (clubs/spades). */
export declare function isSuitRed(suit: Suit): boolean;
