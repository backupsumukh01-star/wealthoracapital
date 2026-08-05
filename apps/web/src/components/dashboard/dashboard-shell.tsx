'use client'

import type { ReactNode } from 'react'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MobileBottomNav } from '@/components/dashboard/mobile-nav'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Topbar } from '@/components/dashboard/topbar'
import { PageTransition } from '@/components/motion/page-transition'
import { InvestorPermissionRouteGuard } from '@/features/auth/guards'
import { cn } from '@/lib/cn'

/**
 * Investor shell — single document scroll.
 *
 * The topbar is `position: fixed` (not sticky). Sticky headers share a stacking /
 * hit-testing context with transformed Framer Motion cards that scroll underneath;
 * those layers steal clicks until you scroll back to the top. Fixed chrome + a
 * flow spacer permanently keeps avatar / bell / deposit controls clickable.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <InvestorPermissionRouteGuard>
        <div className="relative flex min-h-full max-w-[100vw] bg-base">
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

          <div className="sticky top-0 z-40 hidden h-svh shrink-0 self-start p-3 lg:block">
            <Sidebar className="flex h-full rounded-3xl border border-glass-line" />
          </div>

          <div className="relative flex min-w-0 flex-1 flex-col">
            {/* Reserves vertical space for the fixed topbar (height + safe area). */}
            <div
              aria-hidden
              className="shrink-0"
              style={{
                height: 'calc(var(--topbar-height) + env(safe-area-inset-top, 0px))',
              }}
            />

            <Topbar />

            <main
              id="main"
              className={cn(
                'relative z-0 min-w-0 flex-1 overflow-x-clip py-5 lg:py-7',
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
      </InvestorPermissionRouteGuard>
    </ProtectedRoute>
  )
}
