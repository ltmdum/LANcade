import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playPopSound, playTickSound, playOkaySound, playWarningSound } from '../../utils/sounds';

const mockGainNode = {
  connect: vi.fn().mockReturnThis(),
  gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
};
const mockOscNode = {
  connect: vi.fn().mockReturnValue(mockGainNode),
  frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  type: '',
  start: vi.fn(),
  stop: vi.fn(),
};

beforeEach(() => {
  vi.stubGlobal('AudioContext', vi.fn(() => ({
    createOscillator: vi.fn().mockReturnValue(mockOscNode),
    createGain: vi.fn().mockReturnValue(mockGainNode),
    destination: {},
    currentTime: 0,
  })));
});

describe('playPopSound', () => {
  it('does not throw for valid frequencies', () => {
    expect(() => playPopSound(200)).not.toThrow();
    expect(() => playPopSound(525)).not.toThrow();
    expect(() => playPopSound(900)).not.toThrow();
  });

  it('accepts a custom duration', () => {
    expect(() => playPopSound(500, 0.3)).not.toThrow();
  });
});

describe('playOkaySound', () => {
  it('does not throw', () => {
    expect(() => playOkaySound()).not.toThrow();
  });
});

describe('playWarningSound', () => {
  it('does not throw', () => {
    expect(() => playWarningSound()).not.toThrow();
  });
});

describe('playTickSound', () => {
  it('does not throw', () => {
    expect(() => playTickSound()).not.toThrow();
  });
});
