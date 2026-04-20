/** All four suits. */
export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
/** All thirteen ranks in order. */
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
/** Map from rank to numeric value (A=1, J=11, Q=12, K=13). */
export const RANK_VALUES = {
    A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
};
/** Suit display symbols. */
export const SUIT_SYMBOLS = {
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
    spades: '\u2660',
};
/** Whether a suit is red (hearts/diamonds) or black (clubs/spades). */
export function isSuitRed(suit) {
    return suit === 'hearts' || suit === 'diamonds';
}
//# sourceMappingURL=cards.js.map