'use client'

import {
  forwardRef,
  useId,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check, Minus } from 'lucide-react'

import { cn } from '@/lib/cn'

import { Label } from './label'

export const Checkbox = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-line-strong',
        'bg-inset transition-colors duration-[100ms]',
        'hover:border-accent-600',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'focus-visible:ring-offset-base',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        'data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="text-accent-foreground">
        {props.checked === 'indeterminate' ? (
          <Minus className="size-3 stroke-[3]" aria-hidden />
        ) : (
          <Check className="size-3 stroke-[3]" aria-hidden />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})

export interface CheckboxFieldProps
  extends ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label: ReactNode
  /** Sits under the label, for the consent copy that always accompanies a legal checkbox. */
  hint?: ReactNode
}

/**
 * Checkbox plus its label, wired by id.
 *
 * The whole label is a hit target, which matters most on the consent checkboxes where an
 * 18px box on a phone is not a reasonable thing to ask someone to hit.
 */
export const CheckboxField = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxFieldProps
>(function CheckboxField({ label, hint, className, id, ...props }, ref) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <Checkbox ref={ref} id={inputId} className="mt-0.5" {...props} />
      <div className="space-y-1">
        <Label htmlFor={inputId} className="cursor-pointer font-normal text-fg-muted">
          {label}
        </Label>
        {hint ? <p className="text-caption text-fg-subtle">{hint}</p> : null}
      </div>
    </div>
  )
})
