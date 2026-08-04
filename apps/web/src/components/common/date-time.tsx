import type { IsoDateTime } from '@meridian/shared'

import { formatDate, formatDateTime, formatRelative } from '@/lib/format'
import { cn } from '@/lib/cn'

export interface DateTimeProps {
  value: IsoDateTime
  /** `date` for a day, `datetime` with the time, `relative` for "3 hours ago". */
  format?: 'date' | 'datetime' | 'relative'
  className?: string
}

/**
 * Renders a timestamp inside a `<time>` element with the machine-readable value in `dateTime`.
 *
 * The relative form always carries the absolute timestamp in its `title`: "3 days ago" is easier
 * to scan but useless when someone is reconciling a payment against a bank statement.
 */
export function DateTime({ value, format = 'datetime', className }: DateTimeProps) {
  const absolute = formatDateTime(value)

  const text =
    format === 'relative'
      ? formatRelative(value)
      : format === 'date'
        ? formatDate(value)
        : absolute

  return (
    <time
      dateTime={value}
      title={format === 'relative' ? absolute : undefined}
      className={cn('tabular-nums', className)}
    >
      {text}
    </time>
  )
}
