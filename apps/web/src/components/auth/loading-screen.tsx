'use client'

import { LogoMark } from '@/components/brand/logo-mark'
import { cn } from '@/lib/cn'

/** Full-viewport loading state — Growzy mark + soft branded pulse. */
export function LoadingScreen({
  label = 'Loading…',
  className,
  compact,
}: {
  label?: string
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-5',
        compact ? 'py-16' : 'min-h-[50vh] py-20',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative grid place-items-center">
        <div
          aria-hidden
          className="absolute size-20 animate-pulse rounded-full bg-accent-500/20 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute size-14 animate-[pulse-ring_2.4s_ease-out_infinite] rounded-full border border-accent-400/40"
        />
        <LogoMark className="relative size-11 drop-shadow-[0_0_18px_rgba(18,214,160,0.45)]" />
      </div>
      <div className="text-center">
        <p className="bg-gradient-to-r from-[#5EF2C4] to-[#2AE8FF] bg-clip-text text-caption font-medium text-transparent">
          Growzy
        </p>
        <p className="mt-1 text-body-sm text-fg-muted">{label}</p>
      </div>
    </div>
  )
}
