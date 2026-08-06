'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownToLine, ArrowUpFromLine, Sparkles } from 'lucide-react'

import { Money } from '@/components/common/money'
import { LIVE_ACTIVITY } from '@/lib/landing-data'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

const FLAGS: Record<string, string> = {
  IN: '🇮🇳',
  ES: '🇪🇸',
  GB: '🇬🇧',
  PK: '🇵🇰',
  SG: '🇸🇬',
  AE: '🇦🇪',
}

type ToastKind = 'deposit' | 'withdrawal' | 'profit' | 'investment'

/**
 * Compact bottom-left activity chip — never blocks CTAs.
 * Demo Mode marketing fixtures (display only — not wallet/ledger data).
 */
export function LiveActivityToasts() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const feed = useMemo(() => [...LIVE_ACTIVITY], [])
  const indexRef = useRef(0)

  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [kind, setKind] = useState<ToastKind>('deposit')

  useEffect(() => {
    if (prefersReducedMotion) return
    if (feed.length === 0) return

    let hideTimer: number | undefined
    const delay = 9000
    const showMs = 4800

    const showNext = () => {
      const next = (indexRef.current + 1) % feed.length
      indexRef.current = next
      setIndex(next)
      const item = feed[next]!
      const fromItem = item.type
      if (
        fromItem === 'deposit' ||
        fromItem === 'withdrawal' ||
        fromItem === 'profit' ||
        fromItem === 'investment'
      ) {
        setKind(fromItem)
      } else {
        const kinds: ToastKind[] = ['deposit', 'withdrawal', 'profit', 'investment']
        setKind(kinds[Math.floor(Math.random() * kinds.length)]!)
      }
      setVisible(true)
      hideTimer = window.setTimeout(() => setVisible(false), showMs)
    }

    const start = window.setTimeout(showNext, 2400)
    const loop = window.setInterval(showNext, delay)

    return () => {
      window.clearTimeout(start)
      window.clearTimeout(hideTimer)
      window.clearInterval(loop)
    }
  }, [prefersReducedMotion, feed])

  if (prefersReducedMotion || feed.length === 0) return null

  const item = feed[index % feed.length]!
  const Icon =
    kind === 'deposit'
      ? ArrowDownToLine
      : kind === 'withdrawal'
        ? ArrowUpFromLine
        : Sparkles
  const label =
    kind === 'deposit'
      ? 'Deposit'
      : kind === 'withdrawal'
        ? 'Withdrawal'
        : kind === 'investment'
          ? 'Investment'
          : 'Profit credited'
  const initial = item.name.charAt(0)

  return (
    <div
      className="pointer-events-none fixed bottom-3 left-3 z-30 sm:bottom-5 sm:left-5"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {visible ? (
          <motion.div
            key={`${kind}-${item.name}-${index}`}
            initial={{ opacity: 0, y: 24, x: -8 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 14, x: -6 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-[56px] w-[min(220px,calc(100vw-1.5rem))] items-center gap-2 rounded-2xl border border-white/[0.08] bg-[rgb(16_27_38/0.85)] px-2 shadow-[0_8px_24px_rgb(0_0_0/0.35)] backdrop-blur-xl"
          >
            <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-inset text-[11px] font-semibold text-fg">
              {initial}
              <span className="absolute -bottom-0.5 -right-0.5 text-[9px] leading-none">
                {FLAGS[item.region] ?? '🌍'}
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium leading-tight text-fg">{label}</p>
              <p className="mt-0.5 truncate text-[10px] leading-tight text-fg-muted">
                {item.name} ·{' '}
                <Money value={item.amount as never} className="text-[10px] font-medium text-fg" />
              </p>
            </div>
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full',
                kind === 'withdrawal'
                  ? 'bg-accent-500/15 text-accent-300'
                  : 'bg-profit/15 text-profit',
              )}
            >
              <Icon className="size-3" aria-hidden />
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
