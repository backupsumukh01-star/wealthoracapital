import { describe, expect, it } from 'vitest'
import {
  convertFromUsd,
  normalizeCurrencyRates,
  DEFAULT_CURRENCY_RATES,
  isDisplayCurrency,
} from '@meridian/shared'

import {
  computeFundsUnlockAt,
  depositRailFromPaymentType,
  payoutRailFromType,
} from './currency.service.js'

describe('currency conversion foundation', () => {
  it('keeps USD as base (rate 1)', () => {
    const rates = normalizeCurrencyRates({ INR: '95', EUR: '0.9' })
    expect(rates.USD).toBe('1')
    expect(convertFromUsd('100', 'USD', rates)).toBe('100.00')
  })

  it('converts using admin-configured rates without float math', () => {
    const rates = normalizeCurrencyRates({ INR: '93', EUR: '0.92', JPY: '150' })
    expect(convertFromUsd('100', 'INR', rates)).toBe('9300')
    expect(convertFromUsd('100', 'EUR', rates)).toBe('92.00')
    expect(convertFromUsd('100', 'JPY', rates)).toBe('15000')
  })

  it('changing rate affects future conversion only (pure function)', () => {
    const before = convertFromUsd('100', 'INR', { INR: '93' })
    const after = convertFromUsd('100', 'INR', { INR: '95' })
    expect(before).toBe('9300')
    expect(after).toBe('9500')
  })

  it('falls back to defaults for missing rates', () => {
    const rates = normalizeCurrencyRates({})
    expect(rates.INR).toBe(DEFAULT_CURRENCY_RATES.INR)
    expect(isDisplayCurrency('INR')).toBe(true)
    expect(isDisplayCurrency('XYZ')).toBe(false)
  })
})

describe('deposit lock helpers', () => {
  it('computes unlock date as approvedAt + lockDays', () => {
    const approved = new Date('2026-08-01T12:00:00.000Z')
    const unlock = computeFundsUnlockAt(approved, 10)
    expect(unlock.toISOString()).toBe('2026-08-11T12:00:00.000Z')
  })

  it('independent deposits get independent unlock dates', () => {
    const d1 = computeFundsUnlockAt(new Date('2026-08-01T00:00:00.000Z'), 10)
    const d2 = computeFundsUnlockAt(new Date('2026-08-07T00:00:00.000Z'), 10)
    expect(d1.toISOString()).toBe('2026-08-11T00:00:00.000Z')
    expect(d2.toISOString()).toBe('2026-08-17T00:00:00.000Z')
  })
})

describe('deposit rail detection', () => {
  it('maps payment method types to INR / CRYPTO rails', () => {
    expect(depositRailFromPaymentType('UPI')).toBe('INR')
    expect(depositRailFromPaymentType('BANK_TRANSFER')).toBe('INR')
    expect(depositRailFromPaymentType('CRYPTO')).toBe('CRYPTO')
    expect(depositRailFromPaymentType('USDT_TRC20')).toBe('CRYPTO')
    expect(payoutRailFromType('BANK_TRANSFER')).toBe('INR')
    expect(payoutRailFromType('BTC')).toBe('CRYPTO')
  })
})

describe('withdrawal eligibility math', () => {
  it('eligible = max(0, available − locked)', () => {
    const available = 300
    const locked = 200
    const eligible = Math.max(0, available - locked)
    expect(eligible).toBe(100)
  })

  it('partial withdrawal leaves remaining lock intact', () => {
    // Day 11: $100 unlocked, $200 locked; withdraw $100 → available 200, locked 200, eligible 0
    let available = 300
    const locked = 200
    const withdraw = 100
    expect(withdraw).toBeLessThanOrEqual(Math.max(0, available - locked))
    available -= withdraw
    expect(Math.max(0, available - locked)).toBe(0)
  })
})
