import { describe, it, expect } from 'vitest';
import { resolveBindAddresses } from '../utils/resolve-bind-addresses.js';

describe('resolveBindAddresses', () => {
  it('uses explicit HOST when provided', () => {
    const result = resolveBindAddresses('10.0.0.5', true, ['192.168.1.1']);
    expect(result).toEqual(['10.0.0.5']);
  });

  it('explicit HOST takes priority even when LAN_ONLY is false', () => {
    const result = resolveBindAddresses('0.0.0.0', false, []);
    expect(result).toEqual(['0.0.0.0']);
  });

  it('binds to LAN addresses when LAN_ONLY and no explicit HOST', () => {
    const result = resolveBindAddresses(null, true, ['192.168.1.10']);
    expect(result).toEqual(['192.168.1.10']);
  });

  it('binds to multiple LAN addresses when available', () => {
    const result = resolveBindAddresses(null, true, ['192.168.1.10', '10.0.0.5']);
    expect(result).toEqual(['192.168.1.10', '10.0.0.5']);
  });

  it('throws when LAN_ONLY and no private interface found', () => {
    expect(() => resolveBindAddresses(null, true, [])).toThrow(
      'LAN_ONLY is enabled but no private network interface was found'
    );
  });

  it('binds to 0.0.0.0 when not LAN_ONLY and no explicit HOST', () => {
    const result = resolveBindAddresses(null, false, []);
    expect(result).toEqual(['0.0.0.0']);
  });

  it('binds to 0.0.0.0 when not LAN_ONLY even with LAN addresses', () => {
    const result = resolveBindAddresses(null, false, ['192.168.1.1']);
    expect(result).toEqual(['0.0.0.0']);
  });
});
