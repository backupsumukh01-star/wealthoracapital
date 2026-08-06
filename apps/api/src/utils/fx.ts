import { d, Decimal, moneyDisplay, moneyString } from './money.js'

/** Default desk rate when platform settings are not yet seeded. */
export const DEFAULT_USD_INR_RATE = d('93')

/** USD display: always 2 decimal places. */
export function usdDisplay(value: string | number | Decimal): string {
  return moneyDisplay(value)
}

/** INR display: whole rupees, no fractional digits. */
export function inrDisplay(value: string | number | Decimal): string {
  return d(value).toFixed(0)
}

/** Convert USD → INR using desk rate; result rounded to whole rupees. */
export function usdToInr(usd: string | number | Decimal, rate: string | number | Decimal): Decimal {
  return d(usd).mul(d(rate)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
}

/** Convert INR → USD using desk rate; result at 2 decimal places for UI / validation. */
export function inrToUsd(inr: string | number | Decimal, rate: string | number | Decimal): Decimal {
  const r = d(rate)
  if (!r.isFinite() || r.lte(0)) return d(0)
  return d(inr).div(r).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
}

/** Persistable USD amount (8dp storage). */
export function usdStorage(value: string | number | Decimal): string {
  return moneyString(value, 8)
}

/** Persistable INR amount (whole rupees as 8dp decimal string). */
export function inrStorage(value: string | number | Decimal): string {
  return moneyString(inrDisplay(value), 8)
}

export function rateDisplay(value: string | number | Decimal): string {
  const n = d(value)
  if (!n.isFinite() || n.lte(0)) return moneyDisplay(DEFAULT_USD_INR_RATE)
  // Trim trailing zeros but keep at least 2dp for admin forms.
  const fixed = n.toFixed(8).replace(/\.?0+$/, '')
  return fixed.includes('.') ? fixed : `${fixed}.00`
}
