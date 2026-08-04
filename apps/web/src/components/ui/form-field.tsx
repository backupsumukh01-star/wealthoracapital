'use client'

import { useId, type ReactElement, type ReactNode } from 'react'
import { cloneElement, isValidElement } from 'react'

import { cn } from '@/lib/cn'

import { Label } from './label'

export interface FormFieldProps {
  label: string
  /** The control. Receives `id`, `aria-describedby` and `aria-invalid` automatically. */
  children: ReactElement<Record<string, unknown>>
  hint?: ReactNode
  error?: string
  required?: boolean
  className?: string
  /** Hides the label visually while keeping it available to screen readers. */
  labelHidden?: boolean
}

/**
 * Label + control + hint + error, wired together.
 *
 * The wiring is the point: every form control in the product gets a real `<label>`, an
 * `aria-describedby` pointing at its hint and error, and `aria-invalid` when it fails —
 * without each form having to remember (docs/09 §7).
 */
export function FormField({
  label,
  children,
  hint,
  error,
  required,
  className,
  labelHidden,
}: FormFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        invalid: error ? true : undefined,
      })
    : children

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id} required={required} className={labelHidden ? 'sr-only' : undefined}>
        {label}
      </Label>

      {control}

      {hint && !error ? (
        <p id={hintId} className="text-caption text-fg-subtle">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-caption text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
