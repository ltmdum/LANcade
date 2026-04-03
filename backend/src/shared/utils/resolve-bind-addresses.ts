/**
 * Determine which address the server should bind to.
 * Always restricts to a private LAN address unless an explicit HOST is set.
 * When multiple LAN addresses are available, the first entry is used (callers
 * should sort by preference before passing).
 * @param explicitHost HOST env var value, or null if not set.
 * @param lanAddresses Private IPv4 addresses discovered on the machine, best first.
 * @returns Address to bind to.
 * @throws When no private network interface is available.
 */
export function resolveBindAddress(
  explicitHost: string | null,
  lanAddresses: string[]
): string {
  if (explicitHost) {
    return explicitHost;
  }

  if (lanAddresses.length === 0) {
    throw new Error(
      'No private network interface was found. Set HOST explicitly or connect to a LAN.'
    );
  }
  return lanAddresses[0];
}
