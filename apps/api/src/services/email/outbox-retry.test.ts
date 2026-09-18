import { describe, expect, it } from 'vitest'

import { outboxRetryDelayMs } from './outbox-retry.js'

describe('email outbox retry backoff', () => {
  it('backs off 429s for at least one minute', () => {
    expect(outboxRetryDelayMs(1, 'Resend send failed (429): rate_limit_exceeded')).toBe(60_000)
    expect(outboxRetryDelayMs(2, '429')).toBe(120_000)
    expect(outboxRetryDelayMs(8, 'rate limit')).toBe(30 * 60_000)
  })

  it('uses a shorter delay for ordinary transport errors', () => {
    expect(outboxRetryDelayMs(1, 'Resend send failed (500)')).toBe(8_000)
    expect(outboxRetryDelayMs(2, 'timeout')).toBe(16_000)
  })
})
