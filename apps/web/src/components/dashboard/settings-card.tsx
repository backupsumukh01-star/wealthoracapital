'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/cn'

/** Compact premium settings card — glass, tight padding, optional icon header. */
export function SettingsCard({
  title,
  description,
  icon: Icon,
  children,
  className,
  action,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <section
      className={cn(
        'glass glass-edge w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/8 shadow-e2',
        className,
      )}
    >
      <header className="flex min-w-0 items-start justify-between gap-2 border-b border-white/6 px-3.5 py-3 sm:gap-3 sm:px-5 sm:py-3.5">
        <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
          {Icon ? (
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-accent-500/15 text-accent-200 sm:size-9">
              <Icon className="size-4" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-body-sm font-medium text-fg">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-pretty text-caption leading-snug text-fg-subtle">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="min-w-0 px-3.5 py-3.5 sm:px-5 sm:py-4">{children}</div>
    </section>
  )
}

export function SettingsRow({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-line/80 bg-inset/35 px-3 py-2.5 sm:px-3.5 sm:py-3">
      <div className="min-w-0">
        <p className="text-caption text-fg-subtle">{label}</p>
        {hint ? <p className="mt-0.5 break-words text-[11px] text-fg-subtle/80">{hint}</p> : null}
      </div>
      <div className="max-w-[50%] shrink-0 break-words text-right text-body-sm font-medium text-fg">
        {value}
      </div>
    </div>
  )
}
