import { describe, it, expect } from 'vitest';
import { resolveBindAddress } from '../utils/resolve-bind-addresses.js';

describe('resolveBindAddress', () => {
  it('uses explicit HOST when provided', () => {
    const result = resolveBindAddress('10.0.0.5', ['192.168.1.1']);
    expect(result).toBe('10.0.0.5');
  });

  it('uses explicit HOST even with no LAN addresses', () => {
    const result = resolveBindAddress('10.0.0.5', []);
    expect(result).toBe('10.0.0.5');
  });

  it('uses first LAN address when no explicit HOST', () => {
    const result = resolveBindAddress(null, ['192.168.1.10', '10.0.0.5']);
    expect(result).toBe('192.168.1.10');
  });

  it('falls back to 0.0.0.0 when no private interface found', () => {
    const result = resolveBindAddress(null, []);
    expect(result).toBe('0.0.0.0');
  });
});
