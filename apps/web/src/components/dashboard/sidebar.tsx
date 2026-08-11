'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { useMemo } from 'react'

import { Logo } from '@/components/common/logo'
import { Badge } from '@/components/ui/badge'
import {
  DASHBOARD_NAV,
  LOGOUT_LINK,
  isRouteActive,
  type NavItem,
  type NavSection,
} from '@/lib/navigation'
import { useLogout } from '@/features/auth/hooks'
import { cn } from '@/lib/cn'
import { useSession } from '@/providers/session-provider'

function useVisibleDashboardNav(): NavSection[] {
  const { can, canAny } = useSession()
  return useMemo(() => {
    return DASHBOARD_NAV.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.permission) return true
        return Array.isArray(item.permission) ? canAny(item.permission) : can(item.permission)
      }),
    })).filter((section) => section.items.length > 0)
  }, [can, canAny])
}

/**
 * Premium glass sidebar — wealth platform navigation.
 * Menus are filtered by session permissions from `/auth/me`.
 */
export function Sidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'glass glass-edge flex h-full w-sidebar shrink-0 flex-col shadow-e3',
        className,
      )}
    >
      <div className="flex h-topbar shrink-0 items-center border-b border-glass-line px-5">
        <Logo />
      </div>

      <SidebarNav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5" />

      <div className="shrink-0 border-t border-glass-line p-3">
        <LogoutButton />
      </div>
    </aside>
  )
}

export function SidebarNav({ className }: { className?: string }) {
  const sections = useVisibleDashboardNav()

  return (
    <nav className={className} aria-label="Account">
      <div className="space-y-7">
        {sections.map((section) => (
          <div key={section.label}>
            <h2 className="px-3 pb-2 text-overline text-fg-subtle">{section.label}</h2>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={`${item.label}-${item.href}`}>
                  <SidebarLink item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}

function LogoutButton() {
  const router = useRouter()
  const logout = useLogout()
  const item = LOGOUT_LINK
  const Icon = item.icon!

  return (
    <button
      type="button"
      onClick={() => {
        void logout.mutateAsync().catch(() => undefined).finally(() => {
          router.push(ROUTES.auth.login)
          router.refresh()
        })
      }}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5',
        'text-body-sm text-fg-muted transition-colors hover:bg-loss/10 hover:text-loss',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{item.label}</span>
    </button>
  )
}

function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const active =
    item.href === ROUTES.dashboard.settings.profile
      ? pathname.startsWith('/settings')
      : isRouteActive(pathname, item)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5',
        'text-body-sm transition-all duration-[160ms]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        active
          ? 'bg-accent-500/12 text-fg shadow-[inset_0_0_0_1px_rgba(18,214,160,0.18)]'
          : 'text-fg-muted hover:bg-hover/60 hover:text-fg',
      )}
    >
      <span
        className={cn(
          'absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent shadow-[0_0_10px_rgba(18,214,160,0.55)]',
          'origin-center transition-all duration-300 ease-out',
          active ? 'scale-y-100 opacity-100' : 'scale-y-50 opacity-0',
        )}
        aria-hidden
      />
      {Icon ? (
        <Icon
          className={cn(
            'size-[22px] shrink-0 transition-colors',
            active ? 'text-accent-300' : 'text-fg-subtle group-hover:text-fg-muted',
          )}
          aria-hidden
        />
      ) : null}
      <span className="truncate">{item.label}</span>
      {item.badge ? (
        <Badge tone="outline" size="sm" className="ml-auto">
          {item.badge}
        </Badge>
      ) : null}
    </Link>
  )
}
