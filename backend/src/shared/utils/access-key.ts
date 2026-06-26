import { safeCompare } from './safe-compare.js';

export type AccessLevel = 'admin' | 'player';

/**
 * Constant-time comparison of a candidate key against the admin and player keys.
 * @param candidate Raw key value from a request.
 * @param adminKey Server-generated admin key.
 * @param playerKey Server-generated player key.
 * @returns Access level the key grants, or null when it does not match either.
 */
export function classifyAccessKey(
  candidate: unknown,
  adminKey: string,
  playerKey: string,
): AccessLevel | null {
  if (typeof candidate !== 'string') return null;
  if (candidate.length !== adminKey.length || candidate.length !== playerKey.length) {
    return null;
  }
  if (safeCompare(candidate, adminKey)) return 'admin';
  if (safeCompare(candidate, playerKey)) return 'player';
  return null;
}
