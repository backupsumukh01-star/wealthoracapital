'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { LogOut, Menu, Search } from 'lucide-react'
import { toast } from 'sonner'

import { AdminOpsNotificationBell } from '@/components/admin/admin-ops-notification-bell'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useLogout } from '@/features/auth/hooks'
import { useSession } from '@/providers/session-provider'

import { AdminNav } from './admin-sidebar'

export function AdminTopbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { session } = useSession()
  const logout = useLogout()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => setOpen(false), [pathname])

  async function signOut() {
    await logout.mutateAsync().catch(() => undefined)
    toast.message('Signed out of operator console')
    router.push(ROUTES.admin.login)
    router.refresh()
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      router.push(ROUTES.admin.search)
      return
    }
    router.push(`${ROUTES.admin.search}?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="pointer-events-auto glass fixed top-0 right-0 z-[100] flex h-[calc(var(--topbar-height)+env(safe-area-inset-top,0px))] items-center gap-3 border-b border-glass-line px-4 pt-[env(safe-area-inset-top,0px)] left-0 lg:left-[var(--sidebar-width)] lg:px-8">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open navigation">
            <Menu aria-hidden />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="lg:hidden">
          <SheetTitle className="sr-only">Operator navigation</SheetTitle>
          <AdminNav className="flex-1 overflow-y-auto px-3 py-6" />
        </SheetContent>
      </Sheet>

      <form onSubmit={onSearch} className="hidden max-w-md flex-1 md:block">
        <Input
          type="search"
          placeholder="User, email, phone, deposit, withdrawal, KYC, wallet, hash…"
          prefix={<Search className="size-4" />}
          aria-label="Global search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Button asChild variant="ghost" size="icon-sm" className="md:hidden" aria-label="Search">
          <Link href={ROUTES.admin.search}>
            <Search className="size-4" aria-hidden />
          </Link>
        </Button>
        <kbd className="hidden rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-fg-subtle lg:inline">
          Ctrl K
        </kbd>
        <AdminOpsNotificationBell />
        <ThemeToggle />
        <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-caption text-fg-muted sm:flex">
          <span className="size-1.5 rounded-full bg-profit" aria-hidden />
          {session?.user.email ?? 'admin'}
        </div>
        <Button variant="ghost" size="sm" onClick={() => void signOut()} aria-label="Sign out">
          <LogOut className="size-4" aria-hidden />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  )
}

/** Soft gate — UI only. The API enforces roles on every request. */
export function AdminSessionGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isStaff, isLoading, session } = useSession()

  useEffect(() => {
    // Never bounce while bootstrapping or while a prior session is still held after a
    // transient API error (rate limit). Only redirect when auth resolved without staff.
    if (isLoading) return
    if (session && isStaff) return
    if (!session || !isAuthenticated || !isStaff) {
      router.replace(ROUTES.admin.login)
    }
  }, [isLoading, isAuthenticated, isStaff, session, router])

  if (isLoading || (session && isStaff)) {
    if (session && isStaff) return <>{children}</>
    return (
      <div className="grid min-h-dvh place-items-center bg-base text-caption text-fg-muted">
        Checking operator session…
      </div>
    )
  }

  // Definitive non-staff / logged-out — brief placeholder while replace(login) runs.
  return (
    <div className="grid min-h-dvh place-items-center bg-base text-caption text-fg-muted">
      Checking operator session…
    </div>
  )
}
