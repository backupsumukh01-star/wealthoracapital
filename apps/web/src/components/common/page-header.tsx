import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export interface PageHeaderProps {
  title: string
  description?: ReactNode
  /** Primary and secondary actions, right-aligned on desktop and stacked on mobile. */
  actions?: ReactNode
  /** Breadcrumbs or a back link, rendered above the title. */
  eyebrow?: ReactNode
  className?: string
}

/**
 * The standard heading block for every authenticated page.
 *
 * It renders the page's only `<h1>`, which keeps the document outline correct for screen
 * readers across all 31 dashboard and admin screens (docs/09 §A11y).
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex min-w-0 flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:pb-6',
        className,
      )}
    >
      <div className="min-w-0 space-y-1 sm:space-y-1.5">
        {eyebrow ? <div className="text-caption text-fg-subtle">{eyebrow}</div> : null}
        <h1 className="text-pretty text-heading-lg text-fg sm:text-heading-xl">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-pretty text-caption text-fg-muted sm:text-body-sm md:text-body-md">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {actions}
        </div>
      ) : null}
    </header>
  )
}

export interface SectionHeaderProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
  /** Renders an `<h2>` by default; pass `h3` for nested sections. */
  as?: 'h2' | 'h3'
  className?: string
}

export function SectionHeader({
  title,
  description,
  actions,
  as: Heading = 'h2',
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <Heading className={cn(Heading === 'h2' ? 'text-heading-lg' : 'text-heading-md', 'text-fg')}>
          {title}
        </Heading>
        {description ? <p className="text-body-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
