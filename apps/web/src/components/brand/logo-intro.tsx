'use client'

import { useEffect, useState } from 'react'

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
 * One-shot splash via CSS opacity — no Framer Motion on the critical path.
 * Skipped entirely on mobile / Save-Data / reduced-motion.
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
    const isMobile = window.matchMedia('(max-width: 639px)').matches
    const saveData =
      'connection' in navigator &&
      Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)

    if (reduced || isMobile || saveData) {
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

  if (phase === 'boot' || phase === 'done') return null

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-[#07090B] transition-opacity duration-300 ease-out"
      style={{ opacity: phase === 'fade' ? 0 : 1 }}
      aria-hidden
      role="presentation"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative motion-safe:animate-fade-in">
          <div className="absolute -inset-8 rounded-full bg-[#D4D9DF]/10 blur-3xl" />
          <LogoMark className="size-20 sm:size-24" tone="color" animated />
        </div>
        <p className="text-2xl font-semibold tracking-tight motion-safe:animate-fade-up sm:text-3xl">
          <span className="bg-gradient-to-r from-[#C4CBD3] via-[#D4D9DF] to-[#F2F4F7] bg-clip-text text-transparent">
            {SITE.wordmark.primary}
          </span>
        </p>
      </div>
    </div>
  )
}
