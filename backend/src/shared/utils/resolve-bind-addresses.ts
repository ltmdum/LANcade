/**
 * Determine which addresses the server should bind to based on
 * configuration and available network interfaces.
 * @param explicitHost HOST env var value, or null if not set.
 * @param lanOnly Whether LAN_ONLY mode is enabled.
 * @param lanAddresses Private IPv4 addresses discovered on the machine.
 * @returns Array of addresses to bind to.
 * @throws When LAN_ONLY is enabled but no private interface is available.
 */
export function resolveBindAddresses(
  explicitHost: string | null,
  lanOnly: boolean,
  lanAddresses: string[]
): string[] {
  if (explicitHost) {
    return [explicitHost];
  }

  if (lanOnly) {
    if (lanAddresses.length === 0) {
      throw new Error(
        'LAN_ONLY is enabled but no private network interface was found. Set HOST explicitly or disable LAN_ONLY.'
      );
    }
    return lanAddresses;
  }

  return ['0.0.0.0'];
}
