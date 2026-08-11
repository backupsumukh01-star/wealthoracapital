'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import {
  LayoutDashboard,
  UserRound,
  Wallet,
  History,
  Sparkles,
} from 'lucide-react'
import { useMemo } from 'react'

import { cn } from '@/lib/cn'
import { isRouteActive, type NavItem } from '@/lib/navigation'
import { useSession } from '@/providers/session-provider'

const MOBILE_NAV: NavItem[] = [
  {
    label: 'Home',
    href: ROUTES.dashboard.root,
    icon: LayoutDashboard,
    permission: 'performance.view',
  },
  { label: 'Wallet', href: ROUTES.dashboard.wallet, icon: Wallet, permission: 'wallet.view' },
  {
    label: 'History',
    href: ROUTES.dashboard.transactions,
    icon: History,
    permission: ['deposits.view', 'withdrawals.view'],
  },
  {
    label: 'Referrals',
    href: ROUTES.dashboard.referrals,
    icon: Sparkles,
    permission: 'profile.view',
  },
  {
    label: 'Profile',
    href: ROUTES.dashboard.settings.profile,
    icon: UserRound,
    permission: 'profile.view',
  },
]

/**
 * App-like bottom navigation for small screens — unauthorized items are hidden.
 */
export function MobileBottomNav() {
  const pathname = usePathname()
  const { can, canAny } = useSession()

  const items = useMemo(
    () =>
      MOBILE_NAV.filter((item) => {
        if (!item.permission) return true
        return Array.isArray(item.permission) ? canAny(item.permission) : can(item.permission)
      }),
    [can, canAny],
  )

  if (items.length === 0) return null

  return (
    <nav
      aria-label="Primary"
      className="glass-strong fixed inset-x-0 bottom-0 z-40 border-t border-glass-line pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul
        className="grid h-16 px-1"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active =
            item.href === ROUTES.dashboard.settings.profile
              ? pathname.startsWith('/settings')
              : isRouteActive(pathname, item)
          const Icon = item.icon!

          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex h-full min-w-0 flex-col items-center justify-center gap-0.5 px-0.5',
                  'text-[10px] font-medium leading-tight sm:text-[11px]',
                  'transition-[color,transform] duration-200 ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  active ? 'text-accent-300' : 'text-fg-subtle hover:text-fg-muted',
                )}
              >
                <span
                  className={cn(
                    'relative grid size-9 place-items-center rounded-full',
                    'transition-[transform,background-color,box-shadow] duration-200 ease-out',
                    active
                      ? 'scale-110 bg-accent-500/18 shadow-[0_0_18px_-2px_rgba(18,214,160,0.55)]'
                      : 'scale-100 group-active:scale-95',
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-accent-500/10 blur-md"
                    />
                  ) : null}
                  <Icon
                    className={cn(
                      'relative size-[22px] transition-transform duration-200',
                      active && 'scale-105',
                    )}
                    strokeWidth={active ? 2.1 : 1.75}
                    aria-hidden
                  />
                </span>
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
