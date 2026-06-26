import { describe, expect, it } from 'vitest';
import { parseAccess } from '../../utils/accessMode';

describe('parseAccess', () => {
  it('recognises a player path', () => {
    expect(parseAccess('/p/ABC123')).toEqual({ mode: 'player', key: 'ABC123' });
  });

  it('recognises an admin path', () => {
    expect(parseAccess('/admin/XYZ789')).toEqual({ mode: 'admin', key: 'XYZ789' });
  });

  it('tolerates a trailing slash', () => {
    expect(parseAccess('/p/ABC/')).toEqual({ mode: 'player', key: 'ABC' });
    expect(parseAccess('/admin/XYZ/')).toEqual({ mode: 'admin', key: 'XYZ' });
  });

  it('returns none for the landing page', () => {
    expect(parseAccess('/')).toEqual({ mode: 'none', key: '' });
    expect(parseAccess('/admin')).toEqual({ mode: 'none', key: '' });
  });

  it('returns none for unknown paths', () => {
    expect(parseAccess('/foo')).toEqual({ mode: 'none', key: '' });
    expect(parseAccess('/p/')).toEqual({ mode: 'none', key: '' });
    expect(parseAccess('/admin/')).toEqual({ mode: 'none', key: '' });
  });

  it('does not accept nested segments after the key', () => {
    expect(parseAccess('/p/ABC/extra')).toEqual({ mode: 'none', key: '' });
    expect(parseAccess('/admin/XYZ/extra')).toEqual({ mode: 'none', key: '' });
  });
});
