import { useRef, useCallback } from 'react';
import { finishRound } from '../utils/api';

/**
 * Refs needed for flash and countdown timers.
 */
export interface TimerRefs {
  /** Ref for flash timeout */
  flashTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  /** Ref for countdown interval */
  countdownTimerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
}

/**
 * Create timer refs for flash and countdown functionality.
 * @returns Object containing timer refs.
 */
export function useTimerRefs(): TimerRefs {
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  return { flashTimerRef, countdownTimerRef };
}

/**
 * Create a flash trigger function.
 * @param flashTimerRef Ref to the flash timer.
 * @param setFlash State setter for flash.
 * @returns Function to trigger a flash effect.
 */
export function useFlashTrigger(
  flashTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  setFlash: (flash: string) => void
): (type: string) => void {
  return useCallback((type: string) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash(type);
    flashTimerRef.current = setTimeout(() => setFlash(''), 350);
  }, [flashTimerRef, setFlash]);
}

/**
 * Create a countdown clear function.
 * @param countdownTimerRef Ref to the countdown timer.
 * @param setCountdown State setter for countdown.
 * @returns Function to clear the countdown.
 */
export function useClearCountdown(
  countdownTimerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
  setCountdown: (countdown: string) => void
): () => void {
  return useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown('');
  }, [countdownTimerRef, setCountdown]);
}

/**
 * Create a finish notification function for Category Clash games.
 * @param playerId Player ID.
 * @param accessKey Access key from the invite URL.
 * @param finishSentRef Ref tracking which rounds have been notified.
 * @returns Function to notify the server of round finish.
 */
export function useNotifyFinish(
  playerId: string,
  accessKey: string,
  finishSentRef: React.MutableRefObject<Set<number>>
): (roundId: number) => Promise<void> {
  return useCallback(async (roundId: number) => {
    if (!playerId || !accessKey) return;
    if (finishSentRef.current.has(roundId)) return;
    finishSentRef.current.add(roundId);
    try {
      await finishRound(playerId, roundId, accessKey);
    } catch {
      // Ignore finish errors
    }
  }, [playerId, accessKey, finishSentRef]);
}
