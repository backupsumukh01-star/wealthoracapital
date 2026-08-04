'use client'

import { forwardRef, useState, type ChangeEvent, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'

import { PasswordStrength } from './password-strength'

export interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showStrength?: boolean
  invalid?: boolean
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { className, showStrength = false, value, defaultValue, onChange, invalid, id, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false)
  const [uncontrolled, setUncontrolled] = useState(
    typeof defaultValue === 'string' ? defaultValue : '',
  )

  const stringValue =
    typeof value === 'string' ? value : uncontrolled

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (value === undefined) setUncontrolled(e.target.value)
    onChange?.(e)
  }

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          invalid={invalid}
          className={cn('pr-11', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={props.disabled}
          className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base disabled:pointer-events-none disabled:opacity-50"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </button>
      </div>
      {showStrength ? <PasswordStrength password={stringValue} /> : null}
    </div>
  )
})
