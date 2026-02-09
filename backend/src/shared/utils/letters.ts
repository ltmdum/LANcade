const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Pick a random uppercase letter from the alphabet.
 * @returns Random uppercase letter.
 */
export function randomLetter(): string {
  return alphabet[Math.floor(Math.random() * alphabet.length)];
}
