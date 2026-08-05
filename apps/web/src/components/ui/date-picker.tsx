'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { Calendar } from 'lucide-react'

import { cn } from '@/lib/cn'

export interface DatePickerProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  /** ISO date, `YYYY-MM-DD`. Dates on the wire are always ISO, never localised strings. */
  value?: string
  onChange?: (value: string) => void
  invalid?: boolean
}

/**
 * A single date field, built on the native date input.
 *
 * The native control is deliberate: it is keyboard accessible, localised, and on mobile it opens
 * the platform picker people already know. A bespoke calendar would be more on-brand and worse
 * to use.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { className, value, onChange, invalid, ...props },
  ref,
) {
  return (
    <div className="relative w-full">
      <input
        ref={ref}
        type="date"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-12 w-full rounded-md border bg-inset px-3.5 pr-10 text-base text-fg',
          'transition-[border-color,box-shadow] duration-[160ms] ease-out-soft',
          'border-line-default hover:border-line-strong',
          'focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/40',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/40',
          '[&::-webkit-calendar-picker-indicator]:opacity-0',
          className,
        )}
        {...props}
      />
      <Calendar
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
        aria-hidden
      />
    </div>
  )
})
