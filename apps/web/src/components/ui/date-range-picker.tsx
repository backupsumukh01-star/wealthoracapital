'use client'

import { Label } from './label'
import { DatePicker } from './date-picker'
import { cn } from '@/lib/cn'

export interface DateRange {
  from?: string
  to?: string
}

export interface DateRangePickerProps {
  value?: DateRange
  onChange?: (value: DateRange) => void
  /** Shown above the fields. Both inputs are labelled individually regardless. */
  label?: string
  className?: string
  disabled?: boolean
}

/**
 * Two date fields, constrained so the end can never precede the start.
 *
 * Enforcing that with `min`/`max` rather than with a validation message means the invalid range
 * cannot be entered in the first place, which is one fewer error the user has to read.
 */
export function DateRangePicker({
  value,
  onChange,
  label,
  className,
  disabled,
}: DateRangePickerProps) {
  return (
    <fieldset className={cn('min-w-0', className)} disabled={disabled}>
      {label ? <legend className="text-caption mb-2 font-medium text-fg-muted">{label}</legend> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="range-from">From</Label>
          <DatePicker
            id="range-from"
            value={value?.from ?? ''}
            max={value?.to}
            onChange={(from) => onChange?.({ ...value, from })}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="range-to">To</Label>
          <DatePicker
            id="range-to"
            value={value?.to ?? ''}
            min={value?.from}
            onChange={(to) => onChange?.({ ...value, to })}
          />
        </div>
      </div>
    </fieldset>
  )
}
