export type AccessMode = 'admin' | 'player' | 'none';

export interface AccessInfo {
  mode: AccessMode;
  key: string;
}

/**
 * Parse the current URL pathname into an access mode and key.
 * Recognises `/admin/<key>` (admin) and `/p/<key>` (player). Anything else
 * is treated as `none`, meaning the user needs an invite link.
 * @param pathname Window location pathname.
 * @returns Parsed access info.
 */
export function parseAccess(pathname: string): AccessInfo {
  const adminMatch = pathname.match(/^\/admin\/([^/?#]+)\/?$/);
  if (adminMatch) {
    return { mode: 'admin', key: adminMatch[1] };
  }
  const playerMatch = pathname.match(/^\/p\/([^/?#]+)\/?$/);
  if (playerMatch) {
    return { mode: 'player', key: playerMatch[1] };
  }
  return { mode: 'none', key: '' };
}
