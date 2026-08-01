export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; label?: string } = {},
): Promise<T> {
  const { maxRetries = 15, baseDelay = 2000, label = 'Operation' } = options;
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- intentional sequential retry
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = baseDelay * (i + 1);
      // oxlint-disable-next-line no-console -- retry logging
      console.log(`${label} attempt ${i + 1}/${maxRetries} failed, retrying in ${delay}ms...`);
      // oxlint-disable-next-line no-await-in-loop -- intentional sequential delay
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
