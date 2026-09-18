import { describe, expect, it } from 'vitest'

import { d } from '../../utils/money.js'

/** Mirrors deposit.service create() bounds: platform min/max, not a hardcoded crypto floor. */
function resolveBounds(platformMin: string, platformMax: string, amount: string) {
  const min = d(platformMin)
  const max = d(platformMax)
  const value = d(amount)
  return {
    belowMin: value.lt(min),
    aboveMax: value.gt(max),
  }
}

describe('deposit platform limits', () => {
  it('accepts $0.70 when admin min deposit is $0.70', () => {
    expect(resolveBounds('0.70', '100000', '0.70').belowMin).toBe(false)
    expect(resolveBounds('0.70', '100000', '0.69').belowMin).toBe(true)
  })

  it('rejects amounts above the admin maximum', () => {
    expect(resolveBounds('1', '500', '500').aboveMax).toBe(false)
    expect(resolveBounds('1', '500', '500.01').aboveMax).toBe(true)
  })

  it('applies the same bounds to crypto and non-crypto amounts', () => {
    expect(resolveBounds('10', '1000', '10').belowMin).toBe(false)
    expect(resolveBounds('10', '1000', '9.99').belowMin).toBe(true)
  })
})
