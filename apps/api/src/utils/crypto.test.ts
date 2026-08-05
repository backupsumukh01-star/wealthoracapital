import { describe, expect, it } from 'vitest'

import { generateReferralCode, generateSecureToken, sha256 } from './crypto.js'

describe('crypto utils', () => {
  it('sha256 is deterministic hex', () => {
    expect(sha256('growzy')).toMatch(/^[a-f0-9]{64}$/)
    expect(sha256('growzy')).toBe(sha256('growzy'))
    expect(sha256('a')).not.toBe(sha256('b'))
  })

  it('generateSecureToken returns unique base64url tokens', () => {
    const a = generateSecureToken()
    const b = generateSecureToken()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('generateReferralCode uses safe alphabet and length', () => {
    const code = generateReferralCode(8)
    expect(code).toHaveLength(8)
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/)
  })
})
