'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

// `prefix` is a string in the DOM typings (the RDFa attribute), so it is replaced rather than
// widened — an interface cannot narrow an inherited member to a different type.
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /** Rendered inside the field, before the value. Decorative only — label it elsewhere. */
  prefix?: ReactNode
  suffix?: ReactNode
  invalid?: boolean
  /** Amounts, prices and references use tabular figures so digits never shift width. */
  numeric?: boolean
}

const fieldBase = [
  'h-12 w-full rounded-xl border bg-inset/80 px-3.5 text-sm text-fg',
  'shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]',
  'transition-[border-color,box-shadow,background-color] duration-[180ms] ease-out-soft',
  'placeholder:text-fg-subtle',
  'border-line-default hover:border-line-strong hover:bg-inset',
  'focus:border-accent focus:bg-inset focus:outline-none',
  'focus:ring-2 focus:ring-accent/25 focus:shadow-[0_0_0_1px_rgb(18_214_160/0.35),0_0_24px_-8px_rgb(18_214_160/0.35)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:hover:border-danger',
  'aria-[invalid=true]:focus:ring-danger/30 aria-[invalid=true]:focus:shadow-[0_0_0_1px_rgb(239_68_68/0.4)]',
]

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', prefix, suffix, invalid, numeric, ...props },
  ref,
) {
  const field = (
    <input
      ref={ref}
      type={type}
      data-numeric={numeric || undefined}
      aria-invalid={invalid || undefined}
      className={cn(...fieldBase, prefix && 'pl-9', suffix && 'pr-12', className)}
      {...props}
    />
  )

  if (!prefix && !suffix) return field

  return (
    <div className="relative w-full">
      {prefix ? (
        <span
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm text-fg-subtle"
          aria-hidden
        >
          {prefix}
        </span>
      ) : null}
      {field}
      {suffix ? (
        <span
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-sm text-fg-subtle"
          aria-hidden
        >
          {suffix}
        </span>
      ) : null}
    </div>
  )
})
