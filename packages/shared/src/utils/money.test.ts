import { describe, expect, it } from 'vitest'

import { formatDecimal, formatMoney, formatPercent, isNegative, signOf } from './money.js'

describe('shared money formatters', () => {
  it('detects negative strings', () => {
    expect(isNegative('-1.00')).toBe(true)
    expect(isNegative('1.00')).toBe(false)
  })

  it('signOf handles zero-like values', () => {
    expect(signOf('0')).toBe(0)
    expect(signOf('-0.00')).toBe(0)
    expect(signOf('12')).toBe(1)
    expect(signOf('-3')).toBe(-1)
  })

  it('formatMoney renders USD by default', () => {
    expect(formatMoney('1234.5')).toContain('1,234.50')
  })

  it('formatPercent adds sign by default', () => {
    expect(formatPercent('1.5')).toBe('+1.50%')
    expect(formatPercent('-2')).toMatch(/−2\.00%|-2\.00%/)
  })

  it('formatDecimal pads decimals', () => {
    expect(formatDecimal('10')).toBe('10.00')
  })
})
