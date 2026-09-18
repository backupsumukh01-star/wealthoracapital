'use client'

import type { ReactNode } from 'react'

import { PageTransition } from '@/components/motion/page-transition'
import { SalesSidebar } from '@/components/sales/sales-sidebar'
import { SalesTopbar } from '@/components/sales/sales-topbar'

export function SalesPortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-base">
      <SalesSidebar className="sticky top-0 hidden h-dvh lg:flex" />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          aria-hidden
          className="shrink-0"
          style={{ height: 'calc(var(--topbar-height) + env(safe-area-inset-top, 0px))' }}
        />
        <SalesTopbar />
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
