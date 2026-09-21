import { describe, expect, it } from 'vitest'

import {
  USD_ONLY_INVESTOR_PAYMENTS,
  filterUsdInvestorPaymentMethods,
  investorDepositRailCards,
  investorWithdrawRailCards,
} from './usd-only-investor-payments'

describe('USD-only investor payment UI', () => {
  it('keeps USD-only investor payments explicit', () => {
    expect(USD_ONLY_INVESTOR_PAYMENTS).toBe(true)
  })

  it('deposit cards show Crypto and not Bank/UPI Coming Soon', () => {
    const cards = investorDepositRailCards()
    expect(cards).toHaveLength(1)
    expect(cards.some((c) => c.id === 'CRYPTO' && c.title === 'Crypto (USDT)')).toBe(true)
    expect(cards.some((c) => c.id === 'BANK' || c.id === 'UPI')).toBe(false)
    expect(cards.some((c) => c.soon || c.desc === 'Coming Soon')).toBe(false)
  })

  it('withdrawal cards show Crypto and not Bank/UPI Coming Soon', () => {
    const cards = investorWithdrawRailCards()
    expect(cards).toHaveLength(1)
    expect(cards.some((c) => c.id === 'CRYPTO' && c.title === 'Crypto (USDT)')).toBe(true)
    expect(cards.some((c) => c.id === 'BANK' || c.id === 'UPI')).toBe(false)
    expect(cards.some((c) => c.soon || /Coming Soon|Amount \(INR\)/i.test(c.desc))).toBe(false)
  })

  it('filters Bank/UPI payment methods out of investor selectors', () => {
    const filtered = filterUsdInvestorPaymentMethods([
      { type: 'BANK_TRANSFER', name: 'Bank' },
      { type: 'UPI', name: 'UPI' },
      { type: 'USDT_TRC20', name: 'USDT' },
      { type: 'CRYPTO', name: 'Crypto' },
    ])
    expect(filtered.map((m) => m.type)).toEqual(['USDT_TRC20', 'CRYPTO'])
  })
})
