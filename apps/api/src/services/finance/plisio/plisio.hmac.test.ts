import { describe, expect, it } from 'vitest'

import {
  buildPlisioWebhookEventId,
  normalizePlisioStatus,
  signPlisioJsonCallback,
  verifyPlisioJsonCallback,
} from './plisio.hmac.js'

describe('Plisio HMAC + status helpers', () => {
  const key = 'test-plisio-secret-key'
  const payload = {
    txn_id: 'abc123',
    status: 'completed',
    order_number: 'DEP-TEST',
    source_currency: 'USD',
    source_amount: '25.00',
  }

  it('signs and verifies json=true callbacks', () => {
    const verify_hash = signPlisioJsonCallback(payload, key)
    expect(verify_hash).toMatch(/^[a-f0-9]{40}$/)
    expect(verifyPlisioJsonCallback({ ...payload, verify_hash }, key)).toBe(true)
  })

  it('rejects tampered payloads', () => {
    const verify_hash = signPlisioJsonCallback(payload, key)
    expect(
      verifyPlisioJsonCallback({ ...payload, source_amount: '999.00', verify_hash }, key),
    ).toBe(false)
    expect(verifyPlisioJsonCallback({ ...payload, verify_hash: '00'.repeat(20) }, key)).toBe(false)
  })

  it('normalizes Plisio statuses', () => {
    expect(normalizePlisioStatus('completed')).toBe('completed')
    expect(normalizePlisioStatus('pending internal')).toBe('pending internal')
    expect(normalizePlisioStatus('cancelled duplicate')).toBe('cancelled duplicate')
    expect(normalizePlisioStatus('nope')).toBe('unknown')
  })

  it('builds idempotent webhook event ids', () => {
    expect(buildPlisioWebhookEventId({ txnId: '1', status: 'completed' })).toBe(
      'plisio:1:completed',
    )
    expect(
      buildPlisioWebhookEventId({ txnId: '1', status: 'completed', txHash: '0xabc' }),
    ).toBe('plisio:1:completed:0xabc')
  })
})
