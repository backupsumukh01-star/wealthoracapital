'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell } from 'lucide-react'

import { useNotifications } from '@/features/notifications/hooks'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useSession } from '@/providers/session-provider'

type LiveToast = {
  id: string
  title: string
  body: string
  time: string
}

function randomDelayMs() {
  return 20_000 + Math.floor(Math.random() * 40_000)
}

/**
 * Compact live toast for recent investor notifications.
 * Renders nothing when the notifications API has no items.
 */
export function LiveActivityFeed() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const { session } = useSession()
  const { data } = useNotifications(undefined, { enabled: Boolean(session) })
  const items = useMemo<LiveToast[]>(
    () =>
      (data?.items ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        time: formatRelative(n.createdAt),
      })),
    [data?.items],
  )

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
    if (!items.length) return
    const wait = prefersReducedMotion ? 45_000 : randomDelayMs()
    const showId = window.setTimeout(() => {
      const next = items[indexRef.current % items.length]!
      indexRef.current += 1
      present(next)

      const hideId = window.setTimeout(() => {
        setToast(null)
        scheduleNext()
      }, 4_000)
      timersRef.current.push(hideId)
    }, wait)
    timersRef.current.push(showId)
  }, [items, prefersReducedMotion, present])

  useEffect(() => {
    clearTimers()
    setToast(null)
    if (!items.length) return

    const first = window.setTimeout(() => {
      indexRef.current = 1
      present(items[0]!)
      const hideId = window.setTimeout(() => {
        setToast(null)
        scheduleNext()
      }, 4_000)
      timersRef.current.push(hideId)
    }, prefersReducedMotion ? 2_000 : 8_000)
    timersRef.current.push(first)

    return clearTimers
  }, [clearTimers, items, prefersReducedMotion, present, scheduleNext])

  if (!items.length) return null

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
        {toast ? (
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
              'bg-[rgb(7_9_11/0.82)] shadow-[0_8px_28px_rgb(0_0_0/0.35),0_0_0_1px_rgb(212_217_223/0.08),0_0_24px_-8px_rgb(212_217_223/0.10)]',
              'backdrop-blur-xl backdrop-saturate-150',
              'will-change-transform',
            )}
          >
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-500/20 text-accent-200"
              aria-hidden
            >
              <Bell className="size-3.5" strokeWidth={2.25} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium leading-tight text-fg">{toast.title}</p>
              <p className="mt-0.5 truncate text-[10px] leading-tight text-fg-subtle">
                {toast.body || toast.time}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
