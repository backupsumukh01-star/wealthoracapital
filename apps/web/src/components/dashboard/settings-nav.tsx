'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

import { DASHBOARD_SETTINGS_NAV } from '@/lib/navigation'
import { cn } from '@/lib/cn'
import { useSession } from '@/providers/session-provider'

/** Horizontal scroll on mobile, vertical from `lg` — never overflows the page. */
export function SettingsNav() {
  const pathname = usePathname()
  const { can, canAny } = useSession()

  const items = useMemo(
    () =>
      DASHBOARD_SETTINGS_NAV.filter((item) => {
        if (!item.permission) return true
        return Array.isArray(item.permission) ? canAny(item.permission) : can(item.permission)
      }),
    [can, canAny],
  )

  return (
    <nav
      aria-label="Settings"
      className="relative min-w-0 max-w-full lg:sticky lg:top-[calc(var(--topbar-height)+1rem)] lg:z-10 lg:self-start"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-base to-transparent lg:hidden"
      />
      <ul className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto overscroll-x-contain px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon

          return (
            <li key={item.href} className="shrink-0 lg:shrink">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5',
                  'text-caption font-medium transition-colors duration-[140ms] sm:text-body-sm',
                  active
                    ? 'bg-accent-500/12 text-fg shadow-[inset_0_0_0_1px_rgba(18,214,160,0.18)]'
                    : 'text-fg-muted hover:bg-hover/60 hover:text-fg',
                )}
              >
                {Icon ? (
                  <Icon
                    className={cn('size-5 shrink-0 sm:size-[22px]', active && 'text-accent-300')}
                    aria-hidden
                  />
                ) : null}
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
