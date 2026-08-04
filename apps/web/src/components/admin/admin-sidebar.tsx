'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { ArrowLeft } from 'lucide-react'

import { LogoMark } from '@/components/common/logo'
import { ADMIN_NAV, isRouteActive, type NavItem } from '@/lib/navigation'
import { cn } from '@/lib/cn'

/**
 * The operator sidebar.
 *
 * It is visually distinct from the investor sidebar — a warmer border and an explicit console
 * label — so an operator with both open never mistakes one window for the other. Acting on the
 * wrong side of that line moves someone else's money.
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

      <div className="border-t border-line p-3">
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
  return (
    <nav className={className} aria-label="Operator console">
      <div className="space-y-6">
        {ADMIN_NAV.map((section) => (
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
  // The overview lives at `/admin`, which prefixes every other admin route, so it matches exactly.
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
