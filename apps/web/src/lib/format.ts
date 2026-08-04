/**
 * Presentation formatters.
 *
 * These re-export the shared implementations so the web app has one import path, and add the
 * handful of helpers that only make sense in a UI context.
 */

export {
  formatDate,
  formatDateTime,
  formatDecimal,
  formatMoney,
  formatPercent,
  formatPrice,
  formatRelative,
  isNegative,
  signOf,
  toIsoDate,
} from '@meridian/shared'

/** `"Ayesha Khan"` → `"AK"`. Falls back to a single character rather than an empty avatar. */
export function initialsOf(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.trim()?.[0] ?? ''
  const last = lastName?.trim()?.[0] ?? ''
  const initials = `${first}${last}`.toUpperCase()
  return initials || '·'
}

/** `1234567` → `"1.2M"`. For counts, never for money — money goes through `formatMoney`. */
export function formatCount(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}

/** `5242880` → `"5 MB"`. Used by the proof uploader's error copy. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)} MB`
}

/** `"DEP-2026-000412"` → `"DEP-…-000412"` for tight table cells. */
export function truncateMiddle(value: string, head = 8, tail = 6): string {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}
