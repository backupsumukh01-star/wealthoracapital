/**
 * Investor payment UI is USD-only until INR (Bank/UPI) gateways are officially enabled.
 * Flip to false to restore Bank/UPI tiles. Do not mutate payment-method rows in the database.
 */
export const USD_ONLY_INVESTOR_PAYMENTS = true

export const USD_INVESTOR_PAYMENT_TYPES = [
  'CRYPTO',
  'USDT_TRC20',
  'USDT_BEP20',
  'BTC',
  'ETH',
] as const

export function isUsdInvestorPaymentType(type: string): boolean {
  return (USD_INVESTOR_PAYMENT_TYPES as readonly string[]).includes(type)
}

/** Hide Bank/UPI methods from investor selectors while USD-only mode is on. */
export function filterUsdInvestorPaymentMethods<T extends { type: string }>(methods: T[]): T[] {
  if (!USD_ONLY_INVESTOR_PAYMENTS) return methods
  return methods.filter((m) => isUsdInvestorPaymentType(m.type))
}

export type InvestorRailCard = {
  id: 'CRYPTO' | 'BANK' | 'UPI'
  title: string
  desc: string
  soon: boolean
}

export function investorDepositRailCards(): InvestorRailCard[] {
  const crypto: InvestorRailCard = {
    id: 'CRYPTO',
    title: 'Crypto (USDT)',
    desc: 'USDT TRC20 / BEP20',
    soon: false,
  }
  if (USD_ONLY_INVESTOR_PAYMENTS) return [crypto]
  return [
    crypto,
    { id: 'BANK', title: 'Bank transfer', desc: 'Coming Soon', soon: true },
    { id: 'UPI', title: 'UPI', desc: 'Coming Soon', soon: true },
  ]
}

export function investorWithdrawRailCards(): InvestorRailCard[] {
  const crypto: InvestorRailCard = {
    id: 'CRYPTO',
    title: 'Crypto (USDT)',
    desc: 'USDT, BTC, ETH',
    soon: false,
  }
  if (USD_ONLY_INVESTOR_PAYMENTS) return [crypto]
  return [
    crypto,
    { id: 'BANK', title: 'Bank', desc: 'Coming Soon', soon: true },
    { id: 'UPI', title: 'UPI', desc: 'Coming Soon', soon: true },
  ]
}
