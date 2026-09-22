'use client'

import { useEffect, useState } from 'react'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

/** Noise texture + soft gradients — no Framer Motion / pointer tracking on the critical path. */
export function PremiumAtmosphere() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [enableAmbient, setEnableAmbient] = useState(true)

  useEffect(() => {
    if (prefersReducedMotion) {
      setEnableAmbient(false)
      return
    }
    // Soft pulse only on fine pointers — avoids extra work on mobile.
    const mq = window.matchMedia('(pointer: fine) and (min-width: 640px)')
    const sync = () => setEnableAmbient(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [prefersReducedMotion])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute -left-32 top-20 size-[28rem] rounded-full bg-accent-500/10 blur-3xl" />
      <div className="absolute -right-24 top-[40%] size-[24rem] rounded-full bg-hl-violet/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 size-[22rem] rounded-full bg-hl-cyan/8 blur-3xl" />

      {enableAmbient ? (
        <div
          className="absolute left-1/2 top-[28%] size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 motion-safe:animate-float"
          style={{
            background:
              'radial-gradient(circle, rgb(212 217 223 / 0.06) 0%, transparent 65%)',
          }}
        />
      ) : null}

      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
