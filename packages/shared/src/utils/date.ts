/** Date display helpers. All API timestamps are ISO 8601 UTC; rendering happens in the user's TZ. */

export function formatDate(
  iso: string,
  options: { locale?: string; timeZone?: string; style?: 'short' | 'medium' | 'long' } = {},
): string {
  const { locale = 'en-US', timeZone, style = 'medium' } = options
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  const presets: Record<typeof style, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
  }

  return new Intl.DateTimeFormat(locale, { ...presets[style], timeZone }).format(date)
}

export function formatDateTime(
  iso: string,
  options: { locale?: string; timeZone?: string } = {},
): string {
  const { locale = 'en-US', timeZone } = options
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date)
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 1000 * 60 * 60 * 24 * 365],
  ['month', 1000 * 60 * 60 * 24 * 30],
  ['week', 1000 * 60 * 60 * 24 * 7],
  ['day', 1000 * 60 * 60 * 24],
  ['hour', 1000 * 60 * 60],
  ['minute', 1000 * 60],
]

export function formatRelative(iso: string, locale = 'en-US', now: Date = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  const elapsed = date.getTime() - now.getTime()
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(elapsed) >= ms) {
      return formatter.format(Math.round(elapsed / ms), unit)
    }
  }
  return formatter.format(Math.round(elapsed / 1000), 'second')
}

/** `"2026-08-02"` for a `Date`, in the given timezone. Trading days are date-only. */
export function toIsoDate(date: Date, timeZone = 'UTC'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(date)
  return parts
}
