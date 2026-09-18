/** Exponential backoff for outbox retries. 429s wait longer so Resend rate limits can clear. */
export function outboxRetryDelayMs(attempts: number, lastError: string): number {
  const n = Math.max(1, attempts)
  const rateLimited = /429|rate.?limit/i.test(lastError)
  if (rateLimited) {
    return Math.min(60_000 * 2 ** (n - 1), 30 * 60_000)
  }
  return Math.min(8_000 * 2 ** (n - 1), 5 * 60_000)
}
