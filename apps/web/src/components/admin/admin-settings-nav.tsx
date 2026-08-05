'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { ADMIN_SETTINGS_NAV } from '@/lib/navigation'
import { cn } from '@/lib/cn'
import { useSession } from '@/providers/session-provider'

/** Settings sub-nav — unauthorized items are hidden. */
export function AdminSettingsNav() {
  const pathname = usePathname()
  const { can, canAny } = useSession()

  const items = useMemo(
    () =>
      ADMIN_SETTINGS_NAV.filter((item) => {
        if (!item.permission) return true
        return Array.isArray(item.permission) ? canAny(item.permission) : can(item.permission)
      }),
    [can, canAny],
  )

  return (
    <nav aria-label="Platform settings" className="lg:sticky lg:top-24 lg:self-start">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
        {items.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2.5',
                  'text-body-sm transition-colors duration-[140ms]',
                  active ? 'bg-hover text-fg' : 'text-fg-muted hover:bg-hover/60 hover:text-fg',
                )}
              >
                {Icon ? (
                  <Icon className={cn('size-4 shrink-0', active && 'text-accent-300')} aria-hidden />
                ) : null}
                {item.label}
                {item.badge === 'super-admin' ? (
                  <Badge tone="outline" size="sm" className="ml-auto hidden lg:inline-flex">
                    Super
                  </Badge>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
