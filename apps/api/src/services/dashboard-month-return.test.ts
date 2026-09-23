import { describe, expect, it } from 'vitest'

import { sumPublishedDailyReturnPcts } from './dashboard-month-return.js'

describe('sumPublishedDailyReturnPcts', () => {
  it('returns 0.00 when there are no published days', () => {
    expect(sumPublishedDailyReturnPcts([])).toBe('0.00')
  })

  it('sums daily percentages (not averages)', () => {
    expect(sumPublishedDailyReturnPcts([0.5, 0.43, 0.65])).toBe('1.58')
    expect(sumPublishedDailyReturnPcts(['0.72', '0.65', '0.81', '0.74'])).toBe('2.92')
  })

  it('does not treat missing pct as a fake nonzero value', () => {
    expect(sumPublishedDailyReturnPcts([null, undefined, 0])).toBe('0.00')
  })
})
