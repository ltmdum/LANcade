/**
 * Format milliseconds as mm:ss.
 * @param ms Duration in milliseconds.
 * @returns Formatted time string.
 */
export function formatMs(ms: number): string {
  const safeMs = Math.max(0, ms || 0);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Parse minutes/seconds strings into milliseconds.
 * @param minutesValue Minutes string.
 * @param secondsValue Seconds string.
 * @returns Total duration in milliseconds or null if invalid.
 */
export function buildDurationMs(minutesValue: string, secondsValue: string): number | null {
  const minutes = parseInt(minutesValue, 10);
  const seconds = parseInt(secondsValue, 10);
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
    return null;
  }
  if (minutes < 0 || seconds < 0 || seconds >= 60) {
    return null;
  }
  const totalSeconds = minutes * 60 + seconds;
  if (totalSeconds <= 0) {
    return null;
  }
  return totalSeconds * 1000;
}

export const minuteOptions = Array.from({ length: 60 }, (_, index) => 
  String(index).padStart(2, '0')
);

export const secondOptions = Array.from({ length: 60 }, (_, index) => 
  String(index).padStart(2, '0')
);
