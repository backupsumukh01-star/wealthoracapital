'use client'

import { ExternalLink } from 'lucide-react'

import { UPI_APPS } from '@/lib/investor-demo-data'
import { cn } from '@/lib/cn'

export function UpiAppCards({
  amount,
  onOpened,
  className,
}: {
  amount?: string
  onOpened?: (appId: string) => void
  className?: string
}) {
  return (
    <div className={cn('grid gap-3', className)}>
      {UPI_APPS.map((app) => {
        const href =
          amount && Number(amount) > 0
            ? `${app.deepLink}&am=${encodeURIComponent(amount)}`
            : app.deepLink

        return (
          <a
            key={app.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpened?.(app.id)}
            className={cn(
              'group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-line p-4',
              'bg-inset/40 transition-all duration-200',
              'hover:-translate-y-0.5 hover:border-line-strong hover:bg-hover/50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <span
              className="absolute inset-y-0 left-0 w-1"
              style={{ background: app.brand }}
              aria-hidden
            />
            <span
              className="grid size-12 shrink-0 place-items-center rounded-xl text-sm font-semibold text-white shadow-e2"
              style={{ background: app.brand }}
              aria-hidden
            >
              {app.name.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm font-medium text-fg">{app.name}</span>
              <span className="block text-caption text-fg-subtle">
                Opens {app.name} with Growzy UPI prefilled
              </span>
            </span>
            <ExternalLink className="size-4 shrink-0 text-fg-subtle transition-colors group-hover:text-accent-300" aria-hidden />
          </a>
        )
      })}
    </div>
  )
}
