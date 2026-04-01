import crypto from 'crypto';

/**
 * Constant-time string comparison to prevent timing side-channel attacks.
 * Returns false immediately if inputs differ in length (acceptable when
 * the length itself is not secret, e.g. fixed-length passwords).
 * @param a First string.
 * @param b Second string.
 * @returns True if the strings are equal.
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
