/**
 * Marker broadcast with the public state while a round is waiting to start
 * after the pre-round 3-2-1-GO countdown. The round clock does not start
 * until `startsAt`.
 */
export interface StartPending {
  /** Server timestamp when the pending-start window began. */
  startedAt: number;
  /** Absolute timestamp when the round will actually begin. */
  startsAt: number;
}

/**
 * Default duration in milliseconds of the pre-round 3-2-1-GO countdown.
 * Individual games opt in by setting `startCountdownMs` on their definition.
 */
export const START_COUNTDOWN_MS = 3000;

/**
 * Extra delay after the countdown digits finish before the round clock
 * starts, so the GO flash and overlay fade have fully played out.
 */
export const START_COUNTDOWN_TAIL_MS = 1000;
