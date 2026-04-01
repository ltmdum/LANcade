/**
 * Tracks concurrent SSE connections per IP and globally.
 * Enforces per-IP and global limits to prevent resource exhaustion.
 */

/**
 * Create a connection tracker instance.
 * @param maxPerIp Maximum concurrent connections per IP address.
 * @param maxGlobal Maximum total concurrent connections.
 * @returns Connection tracker with add, remove, and canConnect methods.
 */
export function createConnectionTracker(maxPerIp = 5, maxGlobal = 50) {
  const countsPerIp = new Map<string, number>();
  let globalCount = 0;

  /**
   * Normalise an IP address for consistent keying.
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
   * Check whether a new connection from this IP is allowed.
   * @param ip Client IP address.
   * @returns Object with `allowed` and a `reason` if denied.
   */
  function canConnect(ip: string): { allowed: true } | { allowed: false; reason: 'too_many_connections' | 'server_busy' } {
    if (globalCount >= maxGlobal) {
      return { allowed: false, reason: 'server_busy' };
    }
    const key = normaliseIp(ip);
    const current = countsPerIp.get(key) || 0;
    if (current >= maxPerIp) {
      return { allowed: false, reason: 'too_many_connections' };
    }
    return { allowed: true };
  }

  /**
   * Register a new connection from an IP.
   * @param ip Client IP address.
   */
  function add(ip: string): void {
    const key = normaliseIp(ip);
    countsPerIp.set(key, (countsPerIp.get(key) || 0) + 1);
    globalCount += 1;
  }

  /**
   * Unregister a connection from an IP.
   * @param ip Client IP address.
   */
  function remove(ip: string): void {
    const key = normaliseIp(ip);
    const current = countsPerIp.get(key) || 0;
    if (current <= 1) {
      countsPerIp.delete(key);
    } else {
      countsPerIp.set(key, current - 1);
    }
    globalCount = Math.max(0, globalCount - 1);
  }

  /**
   * Get the current connection count for an IP.
   * @param ip Client IP address.
   * @returns Number of active connections.
   */
  function getCount(ip: string): number {
    return countsPerIp.get(normaliseIp(ip)) || 0;
  }

  /**
   * Get the total number of active connections.
   * @returns Global connection count.
   */
  function getGlobalCount(): number {
    return globalCount;
  }

  return { canConnect, add, remove, getCount, getGlobalCount };
}

/** Type of the object returned by createConnectionTracker. */
export type ConnectionTracker = ReturnType<typeof createConnectionTracker>;
