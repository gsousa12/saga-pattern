/**
 * Resolves a Promise after a random delay between a specified minimum and maximum number of seconds.
 *
 * @param minSeconds - The minimum delay in seconds (defaults to 1).
 * @param maxSeconds - The maximum delay in seconds (defaults to 10).
 * @returns A Promise that resolves to `void` after the generated delay.
 */
export function randomDelay(minSeconds: number = 1, maxSeconds: number = 10): Promise<void> {
  const minMs = minSeconds * 1000;
  const maxMs = maxSeconds * 1000;

  // Generates a random number of milliseconds between minMs and maxMs
  const randomMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

  return new Promise((resolve) => setTimeout(resolve, randomMs));
}
