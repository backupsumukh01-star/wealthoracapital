import Decimal from 'decimal.js'

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export { Decimal }

export function d(value: string | number | Decimal): Decimal {
  return value instanceof Decimal ? value : new Decimal(value)
}

export function moneyString(value: string | number | Decimal, decimals = 8): string {
  return d(value).toFixed(decimals)
}

export function moneyDisplay(value: string | number | Decimal): string {
  return d(value).toFixed(2)
}

export function assertPositive(amount: Decimal, label = 'Amount'): void {
  if (!amount.isFinite() || amount.lte(0)) {
    throw new Error(`${label} must be a positive decimal.`)
  }
}

export function assertNonNegative(amount: Decimal, label = 'Amount'): void {
  if (!amount.isFinite() || amount.lt(0)) {
    throw new Error(`${label} cannot be negative.`)
  }
}
