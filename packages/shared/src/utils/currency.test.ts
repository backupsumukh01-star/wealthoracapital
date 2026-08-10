import { describe, expect, it } from 'vitest'
import {
  convertFromUsd,
  normalizeCurrencyRates,
  DISPLAY_CURRENCIES,
} from '../utils/currency.js'

describe('@meridian/shared currency utils', () => {
  it('supports the Phase 1A display currency list', () => {
    expect(DISPLAY_CURRENCIES).toEqual([
      'USD',
      'INR',
      'EUR',
      'GBP',
      'JPY',
      'CAD',
      'AUD',
      'AED',
      'SGD',
    ])
  })

  it('convertFromUsd uses Decimal-safe rates from the map', () => {
    const rates = normalizeCurrencyRates({ INR: '93.5', AED: '3.67' })
    expect(convertFromUsd('10', 'INR', rates)).toBe('935')
    expect(convertFromUsd('10', 'AED', rates)).toBe('36.70')
    expect(convertFromUsd('10', 'USD', rates)).toBe('10.00')
  })
})
