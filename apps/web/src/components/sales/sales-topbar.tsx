'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { LogOut, Menu } from 'lucide-react'
import { toast } from 'sonner'

import { ThemeToggle } from '@/components/common/theme-toggle'
import { SalesSidebarNav } from '@/components/sales/sales-sidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useSalesLogout, useSalesMe } from '@/features/sales/hooks'

export function SalesTopbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data } = useSalesMe()
  const logout = useSalesLogout()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  async function signOut() {
    await logout.mutateAsync().catch(() => undefined)
    toast.message('Signed out of Sales Portal')
    router.push(ROUTES.sales.login)
    router.refresh()
  }

  const name = data?.salesman.name ?? 'Sales'
  const code = data?.salesman.code

  return (
    <header className="pointer-events-auto glass fixed top-0 right-0 z-[100] flex h-[calc(var(--topbar-height)+env(safe-area-inset-top,0px))] items-center gap-3 border-b border-glass-line px-4 pt-[env(safe-area-inset-top,0px)] left-0 lg:left-[var(--sidebar-width)] lg:px-8">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open navigation">
            <Menu aria-hidden />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="lg:hidden">
          <SheetTitle className="sr-only">Sales navigation</SheetTitle>
          <SalesSidebarNav className="flex-1 overflow-y-auto px-3 py-6" />
          <div className="border-t border-line p-3">
            <Button variant="ghost" className="w-full justify-start" onClick={() => void signOut()}>
              <LogOut className="size-4" aria-hidden />
              Logout
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-medium text-fg">{name}</p>
        {code ? <p className="truncate text-caption text-fg-subtle">Code {code}</p> : null}
      </div>

      <ThemeToggle />
      <Button
        variant="ghost"
        size="sm"
        className="hidden sm:inline-flex"
        onClick={() => void signOut()}
      >
        <LogOut className="size-4" aria-hidden />
        Logout
      </Button>
    </header>
  )
}
