'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { ArrowLeft } from 'lucide-react'
import { useMemo } from 'react'

import { LogoMark } from '@/components/common/logo'
import { ADMIN_NAV, isRouteActive, type NavItem, type NavSection } from '@/lib/navigation'
import { cn } from '@/lib/cn'
import { useSession } from '@/providers/session-provider'

function useVisibleAdminNav(): NavSection[] {
  const { can, canAny } = useSession()
  return useMemo(() => {
    return ADMIN_NAV.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.permission) return true
        return Array.isArray(item.permission) ? canAny(item.permission) : can(item.permission)
      }),
    })).filter((section) => section.items.length > 0)
  }, [can, canAny])
}

/**
 * The operator sidebar — menus are filtered by the session permission set from `/auth/me`.
 */
export function AdminSidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'flex h-full w-sidebar shrink-0 flex-col border-r border-line bg-raised/60',
        className,
      )}
    >
      <div className="flex h-topbar shrink-0 items-center gap-2.5 border-b border-warning/30 px-5">
        <LogoMark className="size-7 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-body-sm font-semibold text-fg">Operator console</p>
          <p className="text-[11px] text-warning">Live account data</p>
        </div>
      </div>

      <AdminNav className="flex-1 overflow-y-auto px-3 py-5" />

      <div className="border-t border-line p-3 space-y-1">
        <Link
          href={ROUTES.sales.owner.root}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm text-fg-muted transition-colors hover:bg-hover hover:text-fg"
        >
          Sales Owner portal
        </Link>
        <Link
          href={ROUTES.dashboard.root}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm text-fg-muted transition-colors hover:bg-hover hover:text-fg"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          Back to my account
        </Link>
      </div>
    </aside>
  )
}

export function AdminNav({ className }: { className?: string }) {
  const sections = useVisibleAdminNav()

  return (
    <nav className={className} aria-label="Operator console">
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.label}>
            <h2 className="text-overline px-3 pb-2 text-fg-subtle">{section.label}</h2>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <AdminLink item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}

function AdminLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const active =
    item.href === ROUTES.admin.root ? pathname === item.href : isRouteActive(pathname, item)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-3 rounded-md px-3 py-2.5',
        'text-body-sm transition-colors duration-[140ms]',
        active ? 'bg-hover text-fg' : 'text-fg-muted hover:bg-hover/60 hover:text-fg',
      )}
    >
      <span
        className={cn(
          'absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent transition-opacity',
          active ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden
      />
      {Icon ? (
        <Icon className={cn('size-4 shrink-0', active && 'text-accent-300')} aria-hidden />
      ) : null}
      <span className="truncate">{item.label}</span>
    </Link>
  )
}
