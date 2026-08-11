import { describe, expect, it } from 'vitest'

import {
  buildOxapayWebhookEventId,
  normalizeOxapayStatus,
  oxapayHmacSha512Hex,
  oxapaySignaturesMatch,
  verifyOxapayWebhookHmac,
} from './oxapay.hmac.js'

describe('OxaPay HMAC + status helpers', () => {
  const key = 'test-oxapay-merchant-key'
  const body = '{"track_id":"151811887","status":"Paid","order_id":"DEP-TEST"}'

  it('computes HMAC-SHA512 hex of raw body', () => {
    const hex = oxapayHmacSha512Hex(body, key)
    expect(hex).toMatch(/^[a-f0-9]{128}$/)
    expect(verifyOxapayWebhookHmac({ rawBody: body, hmacHeader: hex, merchantApiKey: key })).toBe(
      true,
    )
  })

  it('rejects invalid HMAC with timing-safe compare', () => {
    const hex = oxapayHmacSha512Hex(body, key)
    expect(
      verifyOxapayWebhookHmac({
        rawBody: body,
        hmacHeader: '00'.repeat(64),
        merchantApiKey: key,
      }),
    ).toBe(false)
    expect(oxapaySignaturesMatch(hex, hex.slice(0, -1) + '0')).toBe(false)
    expect(oxapaySignaturesMatch(hex, undefined)).toBe(false)
  })

  it('normalizes capitalized OxaPay statuses', () => {
    expect(normalizeOxapayStatus('Paid')).toBe('paid')
    expect(normalizeOxapayStatus('Paying')).toBe('paying')
    expect(normalizeOxapayStatus('WAITING')).toBe('waiting')
    expect(normalizeOxapayStatus('Underpaid')).toBe('underpaid')
    expect(normalizeOxapayStatus('Expired')).toBe('expired')
    expect(normalizeOxapayStatus('manual_accept')).toBe('manual_accept')
    expect(normalizeOxapayStatus('nope')).toBe('unknown')
  })

  it('builds idempotent webhook event ids', () => {
    expect(buildOxapayWebhookEventId({ trackId: '1', status: 'Paid' })).toBe('oxapay:1:paid')
    expect(
      buildOxapayWebhookEventId({ trackId: '1', status: 'paid', txHash: '0xabc' }),
    ).toBe('oxapay:1:paid:0xabc')
  })
})
