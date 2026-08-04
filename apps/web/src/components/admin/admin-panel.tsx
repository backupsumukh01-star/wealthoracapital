'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/** Glass surface used across admin workspaces. */
export function AdminPanel({
  children,
  className,
  glow,
}: {
  children: ReactNode
  className?: string
  glow?: boolean
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-e2 backdrop-blur-xl',
        glow &&
          'before:pointer-events-none before:absolute before:inset-x-8 before:-top-16 before:h-32 before:rounded-full before:bg-accent-500/15 before:blur-3xl',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AdminPanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-white/[0.06] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-heading-sm text-fg">{title}</h2>
        {description ? <p className="mt-0.5 text-caption text-fg-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
