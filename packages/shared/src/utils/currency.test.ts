import { describe, expect, it } from 'vitest'
import {
  CRYPTO_DEPOSIT_MIN_USD,
  convertFromUsd,
  isCryptoDepositMethodType,
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

  it('crypto deposit floor is $1 for all crypto rails', () => {
    expect(CRYPTO_DEPOSIT_MIN_USD).toBe('1')
    for (const type of ['CRYPTO', 'USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH']) {
      expect(isCryptoDepositMethodType(type)).toBe(true)
    }
    expect(isCryptoDepositMethodType('UPI')).toBe(false)
    expect(isCryptoDepositMethodType('BANK_TRANSFER')).toBe(false)
  })
})
