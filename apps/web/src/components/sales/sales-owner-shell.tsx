'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Menu } from 'lucide-react'
import { ROUTES } from '@meridian/shared'

import { Logo } from '@/components/common/logo'
import { PageTransition } from '@/components/motion/page-transition'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SALES_OWNER_NAV, isSalesNavActive } from '@/features/sales/nav'
import { cn } from '@/lib/cn'

function OwnerNav({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className={className} aria-label="Sales owner">
      <ul className="space-y-0.5">
        {SALES_OWNER_NAV.map((item) => {
          const active = isSalesNavActive(pathname, item.href)
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
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
      <div className="mt-6 border-t border-line pt-4">
        <Link
          href={ROUTES.admin.root}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm text-fg-muted transition-colors hover:bg-hover hover:text-fg"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          Back to Admin
        </Link>
      </div>
    </nav>
  )
}

function OwnerSidebar() {
  return (
    <aside className="glass glass-edge sticky top-0 hidden h-dvh w-sidebar shrink-0 flex-col shadow-e3 lg:flex">
      <div className="flex h-topbar shrink-0 items-center border-b border-glass-line px-5">
        <Logo />
      </div>
      <div className="px-5 pt-4">
        <Badge tone="accent" size="sm">
          Sales Owner
        </Badge>
      </div>
      <OwnerNav className="min-h-0 flex-1 overflow-y-auto px-3 py-5" />
    </aside>
  )
}

function OwnerTopbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])

  return (
    <header className="pointer-events-auto glass fixed top-0 right-0 z-[100] flex h-[calc(var(--topbar-height)+env(safe-area-inset-top,0px))] items-center gap-3 border-b border-glass-line px-4 pt-[env(safe-area-inset-top,0px)] left-0 lg:left-[var(--sidebar-width)] lg:px-8">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open navigation">
            <Menu aria-hidden />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="lg:hidden">
          <SheetTitle className="sr-only">Owner navigation</SheetTitle>
          <OwnerNav className="px-3 py-6" onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <p className="min-w-0 flex-1 truncate text-body-sm font-medium text-fg">Sales Owner</p>
      <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
        <Link href={ROUTES.admin.root}>
          <ArrowLeft className="size-4" aria-hidden />
          Admin
        </Link>
      </Button>
    </header>
  )
}

export function SalesOwnerShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-base">
      <OwnerSidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          aria-hidden
          className="shrink-0"
          style={{ height: 'calc(var(--topbar-height) + env(safe-area-inset-top, 0px))' }}
        />
        <OwnerTopbar />
        <main
          id="main"
          className="relative z-0 min-w-0 flex-1 overflow-x-clip px-4 py-6 lg:px-8 lg:py-8"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}

export function SalesOwnerSwitcher({
  salesmen,
  currentId,
}: {
  salesmen: Array<{ id: string; name: string; code: string }>
  currentId: string
}) {
  const router = useRouter()
  if (salesmen.length === 0) return null
  return (
    <label className="flex min-w-0 flex-col gap-1.5 sm:max-w-xs">
      <span className="text-caption text-fg-subtle">View salesman</span>
      <select
        className="h-12 w-full min-w-0 rounded-xl border border-line-default bg-inset/80 px-3.5 text-base text-fg"
        value={currentId}
        onChange={(event) => {
          const id = event.target.value
          router.push(ROUTES.sales.owner.salesman(id))
        }}
      >
        {salesmen.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name} · {row.code}
          </option>
        ))}
      </select>
    </label>
  )
}
