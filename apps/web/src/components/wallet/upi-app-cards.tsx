'use client'

import { ExternalLink } from 'lucide-react'

import { useDepositMethods } from '@/features/deposits/hooks'
import { cn } from '@/lib/cn'

type UpiApp = {
  id: string
  name: string
  deepLink: string
  brand: string
}

function appsFromMethods(
  methods: Array<{ id: string; name: string; accountDetails: Record<string, string> }> | undefined,
): UpiApp[] {
  if (!methods?.length) return []
  const apps: UpiApp[] = []
  for (const method of methods) {
    const details = method.accountDetails ?? {}
    const deepLink = details.deepLink || details.upiLink || details.upiUri
    if (!deepLink) continue
    apps.push({
      id: method.id,
      name: details.appName || method.name,
      deepLink,
      brand: details.brand || '#D4D9DF',
    })
  }
  return apps
}

export function UpiAppCards({
  amount,
  onOpened,
  className,
}: {
  amount?: string
  onOpened?: (appId: string) => void
  className?: string
}) {
  const { data: methods } = useDepositMethods()
  const apps = appsFromMethods(methods)

  if (!apps.length) return null

  return (
    <div className={cn('grid gap-3', className)}>
      {apps.map((app) => {
        const href =
          amount && Number(amount) > 0
            ? `${app.deepLink}${app.deepLink.includes('?') ? '&' : '?'}am=${encodeURIComponent(amount)}`
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
                Opens {app.name} with Wealthora UPI prefilled
              </span>
            </span>
            <ExternalLink className="size-4 shrink-0 text-fg-subtle transition-colors group-hover:text-accent-300" aria-hidden />
          </a>
        )
      })}
    </div>
  )
}
