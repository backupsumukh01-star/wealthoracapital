'use client'

import type { ReactNode } from 'react'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { DemoSession } from '@/components/dashboard/demo-session'
import { MobileBottomNav } from '@/components/dashboard/mobile-nav'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Topbar } from '@/components/dashboard/topbar'
import { PageTransition } from '@/components/motion/page-transition'
import { cn } from '@/lib/cn'

/**
 * Investor shell — single document scroll.
 * Sticky header + fixed-height sidebar column; no nested page scrollports.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <DemoSession>
        <div className="relative flex min-h-full max-w-[100vw] overflow-x-clip bg-base">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-grid opacity-[0.12]" />
            <div
              className="absolute inset-x-0 top-0 h-[55vh]"
              style={{
                background:
                  'radial-gradient(70% 50% at 50% 0%, rgb(18 214 160 / 0.22) 0%, transparent 70%)',
              }}
            />
            <div className="absolute -left-40 top-24 h-[28rem] w-[28rem] rounded-full bg-accent-500/12 blur-3xl" />
            <div className="absolute -right-32 top-64 h-[24rem] w-[24rem] rounded-full bg-hl-cyan/10 blur-3xl" />
          </div>

          {/* Desktop sidebar column — own height, does not overlay main */}
          <div className="sticky top-0 z-20 hidden h-svh shrink-0 self-start p-3 lg:block">
            <Sidebar className="flex h-full rounded-3xl border border-glass-line" />
          </div>

          <div className="relative z-0 flex min-w-0 flex-1 flex-col">
            <Topbar />

            <main
              id="main"
              className={cn(
                'relative z-0 flex-1 py-5 lg:py-7',
                'px-4 lg:px-8',
                'pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]',
                'lg:pl-8 lg:pr-8',
                'pb-[calc(7.25rem+env(safe-area-inset-bottom))] lg:pb-10',
              )}
            >
              <PageTransition className="mx-auto w-full min-w-0 max-w-content">
                {children}
              </PageTransition>
            </main>
          </div>

          <MobileBottomNav />
        </div>
      </DemoSession>
    </ProtectedRoute>
  )
}
