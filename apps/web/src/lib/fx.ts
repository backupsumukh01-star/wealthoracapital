import Decimal from 'decimal.js'

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

/**
 * Client-side USD ↔ INR helpers.
 *
 * Arithmetic uses decimal.js (never Number). USD shows 2dp; INR shows whole rupees.
 */

export const DEFAULT_USD_INR_RATE = '93'

export function parseRate(rate: string | null | undefined): Decimal {
  try {
    const n = new Decimal(rate && rate.trim() ? rate : DEFAULT_USD_INR_RATE)
    if (!n.isFinite() || n.lte(0)) return new Decimal(DEFAULT_USD_INR_RATE)
    return n
  } catch {
    return new Decimal(DEFAULT_USD_INR_RATE)
  }
}

/** USD → INR (whole rupees). Returns a decimal string without fraction. */
export function usdToInrString(usd: string, rate: string | null | undefined): string {
  const amount = usd.trim()
  if (!amount || !/^\d+(\.\d+)?$/.test(amount)) return ''
  try {
    return new Decimal(amount)
      .mul(parseRate(rate))
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toFixed(0)
  } catch {
    return ''
  }
}

/** INR → USD (2 decimal places). */
export function inrToUsdString(inr: string, rate: string | null | undefined): string {
  const amount = inr.trim()
  if (!amount || !/^\d+$/.test(amount)) return ''
  try {
    const r = parseRate(rate)
    if (r.lte(0)) return ''
    return new Decimal(amount).div(r).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2)
  } catch {
    return ''
  }
}

/** Format an INR amount string for display (₹1,234). */
export function formatInr(value: string, locale = 'en-IN'): string {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(numeric))
}
