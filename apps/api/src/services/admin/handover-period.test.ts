import { describe, expect, it } from 'vitest'

import { formatHistoricalPeriodLabel } from './handover-reset.service.js'

describe('formatHistoricalPeriodLabel', () => {
  it('formats month-based periods below one year', () => {
    expect(formatHistoricalPeriodLabel(1)).toBe('1 month')
    expect(formatHistoricalPeriodLabel(3)).toBe('3 months')
  })

  it('formats whole-year periods', () => {
    expect(formatHistoricalPeriodLabel(12)).toBe('1 year')
    expect(formatHistoricalPeriodLabel(36)).toBe('3 years')
  })

  it('formats fractional years when months do not divide evenly', () => {
    expect(formatHistoricalPeriodLabel(30)).toBe('2.5 years')
  })

  it('returns an empty-state label when no historical months exist', () => {
    expect(formatHistoricalPeriodLabel(0)).toBe('No published performance yet')
  })
})
