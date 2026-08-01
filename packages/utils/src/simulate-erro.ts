/**
 * Return true or false based on the given percentage.
 *
 * @param percentage number - The percentage chance of returning true (0-100).
 * @returns boolean
 */
export function simulateError(percentage: number): boolean {
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  return Math.random() * 100 < clampedPercentage;
}
