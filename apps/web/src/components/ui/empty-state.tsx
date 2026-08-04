import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  /**
   * Explains what will appear here. An empty state that only says "no data" tells the user
   * nothing they did not already know.
   */
  description?: ReactNode
  /** The one action that makes the thing appear. */
  action?: ReactNode
  /** Distinct from empty: "no results match these filters" plus a clear-filters button. */
  variant?: 'empty' | 'filtered'
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'empty',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg px-6 py-16 text-center',
        variant === 'filtered' ? 'border border-dashed border-line-default' : 'bg-inset/40',
        className,
      )}
    >
      {Icon ? (
        <span className="grid size-12 place-items-center rounded-full bg-hover text-fg-subtle">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}

      <div className="flex max-w-sm flex-col gap-1.5">
        <p className="text-heading-sm text-fg">{title}</p>
        {description ? <p className="text-body-sm text-fg-muted">{description}</p> : null}
      </div>

      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}
