'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { ArrowDownToLine, BadgeCheck, Menu } from 'lucide-react'

import { NotificationBell } from '@/components/common/notification-bell'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { UserMenu } from '@/components/common/user-menu'
import { NotificationSheet } from '@/components/dashboard/notification-sheet'
import { SidebarNav } from '@/components/dashboard/sidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useSession } from '@/providers/session-provider'

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function Topbar() {
  const pathname = usePathname()
  const { session } = useSession()
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const greeting = useMemo(() => greetingForHour(new Date().getHours()), [])

  useEffect(() => setOpen(false), [pathname])

  const firstName = session?.user.firstName ?? 'Investor'
  const verified = session?.user.kycStatus === 'APPROVED'

  return (
    <>
      {/*
        Fixed to the viewport (not sticky). Sidebar column is `w-sidebar + p-3*2` on lg;
        left offset keeps the bar aligned to the content column only.
      */}
      <header
        className={[
          'pointer-events-auto fixed top-0 right-0 z-[100]',
          'left-0 lg:left-[calc(var(--sidebar-width)+1.5rem)]',
          'flex h-[calc(var(--topbar-height)+env(safe-area-inset-top,0px))] items-center gap-2',
          'border-b border-glass-line bg-base/85 px-4 pt-[env(safe-area-inset-top,0px)]',
          'shadow-e2 backdrop-blur-xl sm:gap-3 lg:px-8',
        ].join(' ')}
      >
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="size-10 shrink-0 rounded-full p-0 lg:hidden [&_svg]:size-[22px]"
              aria-label="Open navigation"
            >
              <Menu aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className={[
              /* Sit below the fixed topbar so nav is not covered by z-[100] header. */
              'top-[calc(var(--topbar-height)+env(safe-area-inset-top,0px))]',
              'h-[calc(100dvh-var(--topbar-height)-env(safe-area-inset-top,0px))]',
              'pt-0 lg:hidden',
            ].join(' ')}
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarNav className="flex-1 overflow-y-auto px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]" />
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight sm:text-body-sm">
            <span className="bg-gradient-to-r from-[#C4CBD3] via-[#D4D9DF] to-[#F2F4F7] bg-clip-text text-transparent">
              Wealthora Capital
            </span>
          </p>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="truncate text-[11px] text-fg-subtle sm:text-caption">
              {greeting}, {firstName}
            </p>
            {verified ? (
              <span className="hidden items-center gap-1 rounded-full border border-profit/30 bg-profit/10 px-1.5 py-0.5 text-[10px] font-medium text-profit sm:inline-flex">
                <BadgeCheck className="size-3" aria-hidden />
                Verified investor
              </span>
            ) : null}
          </div>
        </div>

        <div className="relative z-[1] ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Button asChild size="sm" className="hidden h-10 min-h-10 shadow-glow sm:inline-flex">
            <Link href={`${ROUTES.dashboard.wallet}?action=deposit`}>
              <ArrowDownToLine aria-hidden />
              Deposit
            </Link>
          </Button>
          <ThemeToggle className="size-10 rounded-full [&_svg]:size-5" />
          <NotificationBell onOpen={() => setNotifOpen(true)} />
          <UserMenu />
        </div>
      </header>

      <NotificationSheet open={notifOpen} onOpenChange={setNotifOpen} />
    </>
  )
}
