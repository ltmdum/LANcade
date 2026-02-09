interface TimerEntry {
  id: number;
  fn: () => void;
  delay: number;
  scheduledAt: number;
}

interface FakeTimerControls {
  restore: () => void;
  advance: (ms: number) => void;
}

/**
 * Replace global timers with a deterministic fake timer implementation.
 * @returns Controls for advancing time and restoring globals.
 */
export function createFakeTimers(): FakeTimerControls {
  const original = {
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
  };
  let nextId = 1;
  let currentTime = 0;
  const timers = new Map<number, TimerEntry>();

  (global as unknown as { setTimeout: typeof setTimeout }).setTimeout = ((fn: () => void, delay: number) => {
    const id = nextId;
    nextId += 1;
    timers.set(id, { id, fn, delay, scheduledAt: currentTime });
    return id as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;

  (global as unknown as { clearTimeout: typeof clearTimeout }).clearTimeout = ((id: ReturnType<typeof setTimeout>) => {
    timers.delete(id as unknown as number);
  }) as typeof clearTimeout;

  /**
   * Advance fake time and fire any elapsed timers.
   * @param ms Milliseconds to advance.
   */
  function advance(ms: number): void {
    const targetTime = currentTime + ms;
    // Find and execute all timers that should fire
    const toFire: TimerEntry[] = [];
    for (const timer of timers.values()) {
      const firesAt = timer.scheduledAt + timer.delay;
      if (firesAt <= targetTime) {
        toFire.push(timer);
      }
    }
    // Sort by fire time
    toFire.sort((a, b) => (a.scheduledAt + a.delay) - (b.scheduledAt + b.delay));
    // Execute in order
    for (const timer of toFire) {
      timers.delete(timer.id);
      currentTime = timer.scheduledAt + timer.delay;
      timer.fn();
    }
    currentTime = targetTime;
  }

  return {
    restore: () => {
      global.setTimeout = original.setTimeout;
      global.clearTimeout = original.clearTimeout;
    },
    advance,
  };
}

/**
 * Run a callback with fake timers and restore them afterward.
 * @param fn Callback to execute with fake timers.
 * @returns Result of the callback.
 */
export async function withFakeTimers<T>(fn: (controls: FakeTimerControls) => T | Promise<T>): Promise<T> {
  const timers = createFakeTimers();
  try {
    return await Promise.resolve(fn(timers));
  } finally {
    timers.restore();
  }
}

/**
 * Run a callback with Math.random stubbed and restore afterward.
 * @param stub Number or function to use as Math.random.
 * @param fn Callback to execute while stubbed.
 * @returns Result of the callback.
 */
export async function withStubbedRandom<T>(stub: number | (() => number), fn: () => T | Promise<T>): Promise<T> {
  const original = Math.random;
  Math.random = typeof stub === 'function' ? stub : () => stub;
  try {
    return await Promise.resolve(fn());
  } finally {
    Math.random = original;
  }
}

/**
 * Return a different letter from the provided one (A/B toggle).
 * @param letter Input letter.
 * @returns Alternate letter.
 */
export function pickOtherLetter(letter: string): string {
  const upper = (letter || 'A').toUpperCase();
  return upper === 'A' ? 'B' : 'A';
}
