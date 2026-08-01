/**
 * Format a number as an ordinal (1st, 2nd, 3rd, 4th...).
 * @param n Number to format.
 * @returns Ordinal string.
 */
export function formatOrdinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) {
    return `${n}th`;
  }
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
