'use client'

import { forwardRef, type TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full resize-y rounded-xl border bg-inset/80 px-3.5 py-2.5 text-base text-fg',
        'shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]',
        'transition-[border-color,box-shadow,background-color] duration-[180ms] ease-out-soft',
        'placeholder:text-fg-subtle',
        'border-line-default hover:border-line-strong hover:bg-inset',
        'focus:border-accent focus:bg-inset focus:outline-none',
        'focus:ring-2 focus:ring-accent/25 focus:shadow-[0_0_0_1px_rgb(212_217_223/0.18),0_0_24px_-8px_rgb(212_217_223/0.10)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-danger aria-[invalid=true]:hover:border-danger',
        'aria-[invalid=true]:focus:ring-danger/30',
        className,
      )}
      {...props}
    />
  )
})
