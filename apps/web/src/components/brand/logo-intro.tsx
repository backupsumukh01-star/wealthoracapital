'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

import { SITE } from '@/lib/constants'

import { LogoMark } from './logo-mark'

const STORAGE_KEY = 'growzy-logo-intro-v1'
const SHOW_MS = 1200
const FADE_MS = 300
const HARD_MAX_MS = 1500

/** Set only after a successful dismiss — survives remounts without sticking the overlay. */
let introDismissed = false

type Phase = 'boot' | 'show' | 'fade' | 'done'

/**
 * One-shot splash (1.5–2s). Fades out, then returns null — fully removed from the DOM.
 * Never depends on usePrefersReducedMotion (that hook starts false and can clear timers mid-show).
 */
export function LogoIntro() {
  const [phase, setPhase] = useState<Phase>('boot')

  useEffect(() => {
    if (introDismissed) {
      setPhase('done')
      return
    }

    try {
      if (sessionStorage.getItem(STORAGE_KEY)) {
        introDismissed = true
        setPhase('done')
        return
      }
    } catch {
      /* private mode */
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      introDismissed = true
      try {
        sessionStorage.setItem(STORAGE_KEY, '1')
      } catch {
        /* ignore */
      }
      setPhase('done')
      return
    }

    // Mobile / Save-Data: skip splash so LCP text is never covered on cold loads.
    const isMobile = window.matchMedia('(max-width: 639px)').matches
    const saveData =
      'connection' in navigator &&
      Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)
    if (isMobile || saveData) {
      introDismissed = true
      try {
        sessionStorage.setItem(STORAGE_KEY, '1')
      } catch {
        /* ignore */
      }
      setPhase('done')
      return
    }

    let cancelled = false
    let fadeTimer = 0
    const prevOverflow = document.body.style.overflow

    setPhase('show')
    document.body.style.overflow = 'hidden'

    const destroy = () => {
      if (cancelled) return
      introDismissed = true
      try {
        sessionStorage.setItem(STORAGE_KEY, '1')
      } catch {
        /* ignore */
      }
      document.body.style.overflow = prevOverflow
      setPhase('done')
    }

    const beginFade = () => {
      if (cancelled || introDismissed) return
      setPhase('fade')
      fadeTimer = window.setTimeout(destroy, FADE_MS)
    }

    const showTimer = window.setTimeout(beginFade, SHOW_MS)
    const hardTimer = window.setTimeout(beginFade, HARD_MAX_MS)

    return () => {
      cancelled = true
      window.clearTimeout(showTimer)
      window.clearTimeout(hardTimer)
      window.clearTimeout(fadeTimer)
      document.body.style.overflow = prevOverflow
    }
  }, [])

  /* Completely absent from the tree after dismiss — no fixed layer, no z-index. */
  if (phase === 'boot' || phase === 'done') return null

  return (
    <motion.div
      className="fixed inset-0 z-[200] grid place-items-center bg-[#07090B]"
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'fade' ? 0 : 1 }}
      transition={{ duration: FADE_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={() => {
        if (phase === 'fade') {
          introDismissed = true
          try {
            sessionStorage.setItem(STORAGE_KEY, '1')
          } catch {
            /* ignore */
          }
          document.body.style.overflow = ''
          setPhase('done')
        }
      }}
      aria-hidden
      role="presentation"
    >
      <div className="flex flex-col items-center gap-5">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="absolute -inset-8 rounded-full bg-[#D4D9DF]/10 blur-3xl" />
          <LogoMark className="size-20 sm:size-24" tone="color" animated />
        </motion.div>

        <motion.p
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="bg-gradient-to-r from-[#C4CBD3] via-[#D4D9DF] to-[#F2F4F7] bg-clip-text text-transparent">
            {SITE.wordmark.primary}
          </span>
        </motion.p>
      </div>
    </motion.div>
  )
}
