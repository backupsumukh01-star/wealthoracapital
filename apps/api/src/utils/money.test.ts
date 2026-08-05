import { describe, expect, it } from 'vitest'

import { assertNonNegative, assertPositive, d, moneyDisplay, moneyString } from './money.js'

describe('money utils', () => {
  it('parses and formats with 8 decimal places', () => {
    expect(moneyString('1.5')).toBe('1.50000000')
    expect(moneyString(d('10.123456789'))).toBe('10.12345679')
  })

  it('formats display money to 2 decimals', () => {
    expect(moneyDisplay('12.345')).toBe('12.35')
  })

  it('assertPositive rejects zero and negative', () => {
    expect(() => assertPositive(d(0))).toThrow(/positive/)
    expect(() => assertPositive(d('-1'))).toThrow(/positive/)
    expect(() => assertPositive(d('0.01'))).not.toThrow()
  })

  it('assertNonNegative allows zero', () => {
    expect(() => assertNonNegative(d(0))).not.toThrow()
    expect(() => assertNonNegative(d('-0.01'))).toThrow(/negative/)
  })

  it('never loses precision on ledger-scale values', () => {
    const a = d('1000000.12345678')
    const b = d('0.00000001')
    expect(moneyString(a.plus(b))).toBe('1000000.12345679')
  })
})
