import { describe, it, expect } from 'vitest';
import { formatOrdinal } from '../../utils/ordinal';

describe('formatOrdinal', () => {
  it('formats 1st, 2nd, 3rd and regular ordinals', () => {
    expect(formatOrdinal(1)).toBe('1st');
    expect(formatOrdinal(2)).toBe('2nd');
    expect(formatOrdinal(3)).toBe('3rd');
    expect(formatOrdinal(4)).toBe('4th');
    expect(formatOrdinal(5)).toBe('5th');
    expect(formatOrdinal(10)).toBe('10th');
  });

  it('uses th for the teens', () => {
    expect(formatOrdinal(11)).toBe('11th');
    expect(formatOrdinal(12)).toBe('12th');
    expect(formatOrdinal(13)).toBe('13th');
    expect(formatOrdinal(21)).toBe('21st');
    expect(formatOrdinal(22)).toBe('22nd');
    expect(formatOrdinal(23)).toBe('23rd');
  });
});
