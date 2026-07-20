import { useEffect, useRef } from 'react';
import { playTickSound, warmupAudio } from '../utils/sounds';

export function useCountdownTick(remainingMs: number | null): void {
  const prevSecondRef = useRef<number | null>(null);
  const primedRef = useRef(false);

  useEffect(() => {
    if (remainingMs === null || remainingMs <= 0) {
      prevSecondRef.current = null;
      return;
    }

    if (!primedRef.current) {
      primedRef.current = true;
      warmupAudio();
    }

    const second = Math.ceil(remainingMs / 1000);
    const prev = prevSecondRef.current;
    prevSecondRef.current = second;

    if (second >= 1 && second <= 3 && prev !== second) {
      playTickSound();
    }
  }, [remainingMs]);
}
