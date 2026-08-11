import { describe, expect, it } from 'vitest'
import { CRYPTO_DEPOSIT_MIN_USD, isCryptoDepositMethodType } from '@meridian/shared'

import { d } from '../../utils/money.js'

/** Mirrors deposit.service create() min selection for crypto vs non-crypto. */
function resolveMin(type: string, methodMinAmount: string) {
  return isCryptoDepositMethodType(type) ? d(CRYPTO_DEPOSIT_MIN_USD) : d(methodMinAmount)
}

describe('crypto deposit minimum', () => {
  it('accepts $1 / $1.50 / $2 against a stale crypto method min of 50', () => {
    const min = resolveMin('CRYPTO', '50')
    expect(d('1').lt(min)).toBe(false)
    expect(d('1.50').lt(min)).toBe(false)
    expect(d('2').lt(min)).toBe(false)
  })

  it('rejects amounts below $1 for crypto', () => {
    const min = resolveMin('USDT_TRC20', '50')
    expect(d('0.99').lt(min)).toBe(true)
    expect(d('0').lt(min)).toBe(true)
  })

  it('does not force $1 onto non-crypto rails', () => {
    const min = resolveMin('UPI', '100')
    expect(d('1').lt(min)).toBe(true)
    expect(d('100').lt(min)).toBe(false)
  })
})
