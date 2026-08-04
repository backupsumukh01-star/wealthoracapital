import type { HTMLAttributes, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertTriangle, CircleAlert, CircleCheck, Info } from 'lucide-react'

import { cn } from '@/lib/cn'

const alertVariants = cva('flex gap-3 rounded-lg border p-4', {
  variants: {
    tone: {
      info: 'border-info/25 bg-info-bg text-fg',
      success: 'border-success/25 bg-success-bg text-fg',
      warning: 'border-warning/25 bg-warning-bg text-fg',
      danger: 'border-danger/25 bg-danger-bg text-fg',
      neutral: 'border-line bg-inset text-fg',
    },
  },
  defaultVariants: { tone: 'info' },
})

const icons = {
  info: Info,
  success: CircleCheck,
  warning: AlertTriangle,
  danger: CircleAlert,
  neutral: Info,
} as const

const iconTones = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-fg-subtle',
} as const

export interface AlertProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof alertVariants> {
  title?: ReactNode
  /** The next action. Every error names one — a dead end is the failure, not the error. */
  action?: ReactNode
  hideIcon?: boolean
}

export function Alert({
  className,
  tone = 'info',
  title,
  action,
  hideIcon,
  children,
  ...props
}: AlertProps) {
  const Icon = icons[tone ?? 'info']

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      {hideIcon ? null : (
        <Icon className={cn('mt-0.5 size-5 shrink-0', iconTones[tone ?? 'info'])} aria-hidden />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? <p className="text-body-sm font-medium text-fg">{title}</p> : null}
        {children ? <div className="text-body-sm text-fg-muted">{children}</div> : null}
        {action ? <div className="mt-2 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  )
}
