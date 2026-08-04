'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

type LiveToast = {
  id: string
  title: string
  amount: string
  time: string
  flag: string
  avatar: string
  kind: 'deposit' | 'withdraw' | 'return'
}

const DEMO: LiveToast[] = [
  {
    id: 'd1',
    title: 'Deposit Approved',
    amount: '+$520',
    time: '2 sec ago',
    flag: '🇺🇸',
    avatar: 'AK',
    kind: 'deposit',
  },
  {
    id: 'd2',
    title: 'Withdrawal Processed',
    amount: '₹18,500',
    time: 'Just now',
    flag: '🇮🇳',
    avatar: 'RS',
    kind: 'withdraw',
  },
  {
    id: 'd3',
    title: 'Daily Return Published',
    amount: '+0.62%',
    time: 'Today',
    flag: '🇬🇧',
    avatar: 'GZ',
    kind: 'return',
  },
  {
    id: 'd4',
    title: 'Deposit Approved',
    amount: '+$1,200',
    time: 'Just now',
    flag: '🇦🇪',
    avatar: 'MK',
    kind: 'deposit',
  },
  {
    id: 'd5',
    title: 'Withdrawal Processed',
    amount: '$850',
    time: '1 min ago',
    flag: '🇸🇬',
    avatar: 'LW',
    kind: 'withdraw',
  },
]

const KIND_ICON = {
  deposit: ArrowDownLeft,
  withdraw: ArrowUpRight,
  return: TrendingUp,
} as const

const KIND_ICON_TONE = {
  deposit: 'bg-profit/20 text-profit',
  withdraw: 'bg-info/20 text-info',
  return: 'bg-accent-500/20 text-accent-200',
} as const

function randomDelayMs() {
  return 20_000 + Math.floor(Math.random() * 40_000)
}

/**
 * Compact Revolut / Apple Pay–style live toast.
 * Fixed overlay only — opacity + transform animations, no layout impact.
 */
export function LiveActivityFeed() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [toast, setToast] = useState<LiveToast | null>(null)
  const [showKey, setShowKey] = useState(0)
  const indexRef = useRef(0)
  const timersRef = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }, [])

  const present = useCallback((item: LiveToast) => {
    setShowKey((k) => k + 1)
    setToast(item)
  }, [])

  const scheduleNext = useCallback(() => {
    const wait = prefersReducedMotion ? 45_000 : randomDelayMs()
    const showId = window.setTimeout(() => {
      const next = DEMO[indexRef.current % DEMO.length]!
      indexRef.current += 1
      present(next)

      const hideId = window.setTimeout(() => {
        setToast(null)
        scheduleNext()
      }, 4_000)
      timersRef.current.push(hideId)
    }, wait)
    timersRef.current.push(showId)
  }, [prefersReducedMotion, present])

  useEffect(() => {
    const first = window.setTimeout(() => {
      indexRef.current = 1
      present(DEMO[0]!)
      const hideId = window.setTimeout(() => {
        setToast(null)
        scheduleNext()
      }, 4_000)
      timersRef.current.push(hideId)
    }, prefersReducedMotion ? 2_000 : 8_000)
    timersRef.current.push(first)

    return clearTimers
  }, [clearTimers, prefersReducedMotion, present, scheduleNext])

  const Icon = toast ? KIND_ICON[toast.kind] : null

  return (
    <div
      className={cn(
        'pointer-events-none fixed z-[33]',
        'left-[max(0.75rem,env(safe-area-inset-left))]',
        'bottom-[calc(5.75rem+env(safe-area-inset-bottom))]',
        'sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] sm:left-auto',
        'sm:right-[max(1.25rem,env(safe-area-inset-right))]',
        'lg:bottom-[max(2rem,env(safe-area-inset-bottom))] lg:right-[max(1.5rem,env(safe-area-inset-right))]',
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        {toast && Icon ? (
          <motion.div
            key={showKey}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 0.95, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
            transition={{
              duration: prefersReducedMotion ? 0.2 : 0.38,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={cn(
              'pointer-events-none flex h-[56px] w-[230px] items-center gap-2 overflow-hidden',
              'rounded-2xl border border-accent-500/25 px-2.5',
              'bg-[rgb(10_20_30/0.82)] shadow-[0_8px_28px_rgb(0_0_0/0.35),0_0_0_1px_rgb(18_214_160/0.08),0_0_24px_-8px_rgb(18_214_160/0.35)]',
              'backdrop-blur-xl backdrop-saturate-150',
              'will-change-transform',
            )}
          >
            {/* Flag + avatar cluster */}
            <div className="relative size-8 shrink-0">
              <span
                className={cn(
                  'grid size-8 place-items-center rounded-full text-[9px] font-semibold tracking-wide text-accent-foreground',
                  'bg-gradient-to-br from-accent-400 to-hl-cyan',
                )}
                aria-hidden
              >
                {toast.avatar}
              </span>
              <span
                className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none drop-shadow"
                aria-hidden
              >
                {toast.flag}
              </span>
            </div>

            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-lg',
                KIND_ICON_TONE[toast.kind],
              )}
              aria-hidden
            >
              <Icon className="size-3.5" strokeWidth={2.25} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium leading-tight text-fg">{toast.title}</p>
              <p className="mt-0.5 truncate text-[10px] leading-tight text-fg-subtle">{toast.time}</p>
            </div>

            <p
              className={cn(
                'shrink-0 text-[12px] font-semibold tabular-nums leading-none',
                toast.kind === 'withdraw' ? 'text-fg' : 'text-profit',
              )}
            >
              {toast.amount}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
