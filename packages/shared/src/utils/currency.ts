import Decimal from 'decimal.js'

/** Supported display currencies (ledger unit of account remains USD). */
export const DISPLAY_CURRENCIES = [
  'USD',
  'INR',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'AED',
  'SGD',
] as const

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number]

export const DEFAULT_DISPLAY_CURRENCY: DisplayCurrency = 'USD'

/** Units of target currency per 1 USD (admin-seed defaults). */
export const DEFAULT_CURRENCY_RATES: Record<DisplayCurrency, string> = {
  USD: '1',
  INR: '93',
  EUR: '0.92',
  GBP: '0.79',
  JPY: '150',
  CAD: '1.36',
  AUD: '1.52',
  AED: '3.67',
  SGD: '1.34',
}

export const DEPOSIT_LOCK_DAYS_DEFAULT = 10

/** Minimum USD (USDT-equivalent) for user crypto deposit rails. */
export const CRYPTO_DEPOSIT_MIN_USD = '1'

export function isCryptoDepositMethodType(type: string): boolean {
  return type === 'CRYPTO' || type === 'USDT_TRC20' || type === 'USDT_BEP20' || type === 'BTC' || type === 'ETH'
}

export function isDisplayCurrency(value: string): value is DisplayCurrency {
  return (DISPLAY_CURRENCIES as readonly string[]).includes(value)
}

export type CurrencyRatesMap = Partial<Record<DisplayCurrency, string>> & Record<string, string>

/** Normalize admin/public rate maps; always include defaults; USD forced to 1. */
export function normalizeCurrencyRates(input?: CurrencyRatesMap | null): Record<DisplayCurrency, string> {
  const out = { ...DEFAULT_CURRENCY_RATES }
  if (input && typeof input === 'object') {
    for (const code of DISPLAY_CURRENCIES) {
      const raw = input[code]
      if (raw == null || raw === '') continue
      try {
        const n = new Decimal(String(raw))
        if (n.isFinite() && n.gt(0)) out[code] = n.toFixed()
      } catch {
        // keep default
      }
    }
  }
  out.USD = '1'
  return out
}

/**
 * Convert USD amount → target currency using admin rates (units of target per 1 USD).
 * Decimal-safe. Does not mutate historical snapshots.
 */
export function convertFromUsd(
  amountUsd: string | number,
  targetCurrency: string,
  rates?: CurrencyRatesMap | null,
): string {
  const normalized = normalizeCurrencyRates(rates)
  const code = isDisplayCurrency(targetCurrency) ? targetCurrency : DEFAULT_DISPLAY_CURRENCY
  const amount = new Decimal(amountUsd || 0)
  if (!amount.isFinite()) return '0.00'
  const rate = new Decimal(normalized[code])
  const converted = amount.mul(rate)
  if (code === 'INR' || code === 'JPY') {
    return converted.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0)
  }
  return converted.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2)
}

export function currencyDecimals(code: string): number {
  return code === 'INR' || code === 'JPY' ? 0 : 2
}
