'use client'

import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { useCmsBootstrap } from '@/features/cms/hooks'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Soft welcome strip after login — sits above dashboard widgets.
 * Dismissible for the session (sessionStorage only — not money state).
 */
export function WelcomeSection({ className }: { className?: string }) {
  const { session } = useSession()
  const { data: cmsBoot, isSuccess } = useCmsBootstrap()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [visible, setVisible] = useState(false)
  const name = session?.user.firstName ?? 'Investor'
  const verified = session?.user.kycStatus === 'APPROVED'
  const greeting = useMemo(() => greetingForHour(new Date().getHours()), [])
  const cms = isSuccess ? cmsBoot?.platform.dashboard : null

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem('growzy_welcome_dismissed') === '1') return
    } catch {
      /* ignore */
    }
    setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <motion.section
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative overflow-hidden rounded-3xl border border-accent-700/30',
        'bg-gradient-to-br from-accent-500/12 via-raised/80 to-inset/90 p-4 shadow-e2 sm:p-5',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-hl-cyan/15 blur-3xl"
      />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-overline text-accent-300">
            <Sparkles className="size-3.5" aria-hidden />
            {cms?.portfolioEyebrow ?? 'Welcome back'}
          </p>
          <h2 className="mt-1.5 text-heading-md text-fg sm:text-heading-lg">
            {cms?.welcomeTitle ? `${greeting}, ${name}` : `${greeting}, ${name}`}
          </h2>
          <p className="mt-1 max-w-xl text-caption text-fg-muted sm:text-body-sm">
            {cms?.welcomeSubtitle ??
              'Your Growzy Wealth desk is live. Capital is under active management — review returns, settle deposits, or message support anytime.'}
          </p>
          {verified ? (
            <p className="mt-2.5 inline-flex items-center gap-1.5 text-caption text-profit">
              <BadgeCheck className="size-3.5" aria-hidden />
              Verified investor
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-caption text-fg-subtle transition-colors hover:bg-hover hover:text-fg"
          onClick={() => {
            try {
              window.sessionStorage.setItem('growzy_welcome_dismissed', '1')
            } catch {
              /* ignore */
            }
            setVisible(false)
          }}
        >
          Dismiss
        </button>
      </div>
    </motion.section>
  )
}
