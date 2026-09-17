'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowLeft } from 'lucide-react'

import { AuthIllustration } from '@/components/auth/auth-illustration'
import { FloatingParticles } from '@/components/auth/floating-particles'
import { Logo } from '@/components/common/logo'
import { cn } from '@/lib/cn'

/**
 * Reusable branded auth shell — glass form column + illustration panel.
 * Used by `(auth)/layout` and available for custom auth surfaces.
 */
export function AuthLayout({
  children,
  className,
  showIllustration = true,
  maxWidthClassName = 'max-w-[520px]',
}: {
  children: ReactNode
  className?: string
  showIllustration?: boolean
  maxWidthClassName?: string
}) {
  return (
    <div
      className={cn(
        'relative grid min-h-dvh max-w-[100vw] overflow-x-clip bg-base',
        showIllustration && 'lg:grid-cols-2',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(50% 40% at 20% 10%, rgb(212 217 223 / 0.08) 0%, transparent 60%), radial-gradient(40% 35% at 80% 80%, rgb(201 164 92 / 0.06) 0%, transparent 65%)',
        }}
        aria-hidden
      />
      <FloatingParticles />

      <div className="relative flex min-w-0 flex-col px-4 py-5 sm:px-8 sm:py-8 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <Logo
            className="min-w-0 shrink gap-2 [&_.font-semibold]:truncate [&_.font-semibold]:text-[1.25rem] sm:[&_.font-semibold]:text-2xl"
            markClassName="size-9 shrink-0 sm:size-10"
          />
          <Link
            href={ROUTES.marketing.home}
            className="inline-flex shrink-0 items-center gap-1 rounded-md text-[12px] text-fg-subtle transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-1.5 sm:text-caption"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to site</span>
          </Link>
        </div>

        <main id="main" className="flex min-w-0 flex-1 items-center justify-center py-6 sm:py-10">
          <div className={cn('w-full min-w-0', maxWidthClassName)}>{children}</div>
        </main>

        <p className="px-1 text-center text-[11px] text-fg-subtle sm:text-caption">
          Capital at risk. Returns are not guaranteed.
        </p>
      </div>

      {showIllustration ? (
        <aside className="relative hidden min-w-0 overflow-hidden border-l border-line lg:block">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-25" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 bg-radial-accent opacity-80"
            aria-hidden
          />
          <FloatingParticles />
          <AuthIllustration />
        </aside>
      ) : null}
    </div>
  )
}
