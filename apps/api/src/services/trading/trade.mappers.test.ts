import { describe, expect, it } from 'vitest'

import { suggestedReturnPct } from './trade.mappers.js'

describe('suggestedReturnPct', () => {
  it('computes BUY profit when exit > entry', () => {
    expect(suggestedReturnPct('BUY', '100', '110').toString()).toBe('10')
  })

  it('computes SELL profit when exit < entry', () => {
    expect(suggestedReturnPct('SELL', '100', '90').toString()).toBe('10')
  })

  it('returns negative for losing BUY', () => {
    expect(suggestedReturnPct('BUY', '100', '95').toNumber()).toBeLessThan(0)
  })

  it('returns 0 when entry is zero', () => {
    expect(suggestedReturnPct('BUY', '0', '10').toString()).toBe('0')
  })
})
