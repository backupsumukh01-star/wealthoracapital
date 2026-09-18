'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Logo } from '@/components/common/logo'
import { Badge } from '@/components/ui/badge'
import { SALESMAN_NAV, isSalesNavActive } from '@/features/sales/nav'
import { cn } from '@/lib/cn'

export function SalesSidebarNav({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav className={className} aria-label="Sales portal">
      <ul className="space-y-0.5">
        {SALESMAN_NAV.map((item) => {
          const active = isSalesNavActive(pathname, item.href)
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm transition-colors',
                  active
                    ? 'bg-accent/12 text-fg shadow-[inset_0_0_0_1px_rgb(201_164_92/0.18)]'
                    : 'text-fg-muted hover:bg-hover hover:text-fg',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function SalesSidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'glass glass-edge flex h-full w-sidebar shrink-0 flex-col shadow-e3',
        className,
      )}
    >
      <div className="flex h-topbar shrink-0 items-center gap-3 border-b border-glass-line px-5">
        <Logo />
      </div>
      <div className="px-5 pt-4">
        <Badge tone="accent" size="sm">
          Sales Portal
        </Badge>
      </div>
      <SalesSidebarNav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5" />
    </aside>
  )
}
