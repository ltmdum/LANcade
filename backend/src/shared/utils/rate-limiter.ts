/**
 * In-memory rate limiter that tracks failed attempts per IP address.
 * Blocks an IP after a configurable number of failures for a cooldown period.
 * Stale entries are cleaned up automatically on each check.
 */

interface AttemptRecord {
  count: number;
  blockedUntil: number | null;
  lastAttempt: number;
}

/**
 * Create a rate limiter instance.
 * @param maxAttempts Maximum failed attempts before blocking.
 * @param cooldownMs Duration in milliseconds to block after exceeding maxAttempts.
 * @returns Rate limiter with isBlocked, recordFailure, and reset methods.
 */
export function createRateLimiter(maxAttempts = 10, cooldownMs = 60_000) {
  const attempts = new Map<string, AttemptRecord>();

  /**
   * Normalise an IP address for consistent keying.
   * Strips the IPv6-mapped IPv4 prefix (::ffff:) if present.
   * @param ip Raw IP address.
   * @returns Normalised IP string.
   */
  function normaliseIp(ip: string): string {
    if (ip.startsWith('::ffff:')) {
      return ip.slice(7);
    }
    return ip;
  }

  /**
   * Remove entries whose cooldown has expired and who have not had
   * a recent attempt. Runs on each call to isBlocked to prevent
   * unbounded map growth.
   */
  function cleanup(): void {
    const now = Date.now();
    for (const [key, record] of attempts) {
      const expiry = record.blockedUntil ?? (record.lastAttempt + cooldownMs);
      if (now > expiry) {
        attempts.delete(key);
      }
    }
  }

  /**
   * Check if an IP is currently blocked.
   * @param ip Client IP address.
   * @returns Remaining seconds if blocked, 0 if not blocked.
   */
  function isBlocked(ip: string): number {
    cleanup();
    const key = normaliseIp(ip);
    const record = attempts.get(key);
    if (!record || !record.blockedUntil) {
      return 0;
    }
    const remaining = record.blockedUntil - Date.now();
    if (remaining <= 0) {
      attempts.delete(key);
      return 0;
    }
    return Math.ceil(remaining / 1000);
  }

  /**
   * Record a failed attempt from an IP. If the attempt count reaches
   * maxAttempts, the IP is blocked for the cooldown period.
   * @param ip Client IP address.
   * @returns True if the IP is now blocked (just hit the threshold).
   */
  function recordFailure(ip: string): boolean {
    const key = normaliseIp(ip);
    const existing = attempts.get(key);
    const record = existing ?? { count: 0, blockedUntil: null as number | null, lastAttempt: 0 };

    record.count += 1;
    record.lastAttempt = Date.now();

    if (record.count >= maxAttempts && !record.blockedUntil) {
      record.blockedUntil = Date.now() + cooldownMs;
      attempts.set(key, record);
      return true;
    }

    attempts.set(key, record);
    return false;
  }

  /**
   * Reset the attempt counter for an IP (e.g. after a successful auth).
   * @param ip Client IP address.
   */
  function reset(ip: string): void {
    attempts.delete(normaliseIp(ip));
  }

  return { isBlocked, recordFailure, reset };
}

/** Type of the object returned by createRateLimiter. */
export type RateLimiter = ReturnType<typeof createRateLimiter>;
