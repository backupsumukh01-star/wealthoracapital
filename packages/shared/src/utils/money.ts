/**
 * Display formatting for monetary values.
 *
 * Everything here takes a decimal **string** and returns a string. There is deliberately no
 * arithmetic in this file: the frontend renders what the API computed (docs/00 §3.5). When
 * arithmetic is genuinely needed it goes through `decimal.js`, never through `Number`.
 */

export interface FormatMoneyOptions {
  currency?: string
  locale?: string
  /** Force a leading `+` on positive values. Useful for deltas. */
  signed?: boolean
  /** Render as `$1.2M` instead of `$1,200,000.00`. */
  compact?: boolean
  /** Drop the currency symbol and render digits only. */
  bare?: boolean
  decimals?: number
}

/** True when the string represents a value below zero, including `"-0.00"`. */
export function isNegative(value: string): boolean {
  return value.trim().startsWith('-')
}

export function signOf(value: string): -1 | 0 | 1 {
  const normalised = value.replace(/[^0-9.-]/g, '')
  if (!normalised || /^-?0*\.?0*$/.test(normalised)) return 0
  return isNegative(normalised) ? -1 : 1
}

export function formatMoney(value: string, options: FormatMoneyOptions = {}): string {
  const {
    currency = 'USD',
    locale = 'en-US',
    signed = false,
    compact = false,
    bare = false,
    decimals = 2,
  } = options

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value

  const formatter = new Intl.NumberFormat(locale, {
    style: bare ? 'decimal' : 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: compact ? 0 : decimals,
    maximumFractionDigits: compact ? 1 : decimals,
  })

  const formatted = formatter.format(Math.abs(numeric))
  const sign = numeric < 0 ? '−' : signed && numeric > 0 ? '+' : ''
  return `${sign}${formatted}`
}

export function formatPercent(
  value: string,
  options: { decimals?: number; signed?: boolean; locale?: string } = {},
): string {
  const { decimals = 2, signed = true, locale = 'en-US' } = options
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(numeric))

  const sign = numeric < 0 ? '−' : signed && numeric > 0 ? '+' : ''
  return `${sign}${formatted}%`
}

/** `"1234.5"` → `"1,234.50"`, without a currency symbol. For table cells and inputs. */
export function formatDecimal(value: string, decimals = 2, locale = 'en-US'): string {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numeric)
}

/** Price formatting for FX quotes, where the pair determines the precision. */
export function formatPrice(value: string, precision = 5, locale = 'en-US'): string {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(numeric)
}
