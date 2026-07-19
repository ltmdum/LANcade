/**
 * Determine which address the server should bind to.
 * Always restricts to a private LAN address unless an explicit HOST is set.
 * When multiple LAN addresses are available, the first entry is used (callers
 * should sort by preference before passing).
 * @param explicitHost HOST env var value, or null if not set.
 * @param lanAddresses Private IPv4 addresses discovered on the machine, best first.
 * @returns Address to bind to.
 */
export function resolveBindAddress(
  explicitHost: string | null,
  lanAddresses: string[]
): string {
  if (explicitHost) {
    return explicitHost;
  }

  if (lanAddresses.length === 0) {
    console.warn(
      'No Wi-Fi network detected. Other devices cannot join over the network, ' +
      'but single-player games will still work. To play with others, connect to ' +
      'a Wi-Fi network or set the HOST environment variable to the device\'s IP address.'
    );
    return '0.0.0.0';
  }
  return lanAddresses[0];
}
