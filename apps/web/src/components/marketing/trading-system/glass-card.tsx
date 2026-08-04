'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

export function GlassCard({
  children,
  className,
  glow = 'accent',
  interactive = true,
}: {
  children: ReactNode
  className?: string
  glow?: 'accent' | 'cyan' | 'violet' | 'amber' | 'emerald' | 'none'
  interactive?: boolean
}) {
  const prefersReducedMotion = usePrefersReducedMotion()

  const glowClass =
    glow === 'accent'
      ? 'before:bg-accent-500/20'
      : glow === 'cyan'
        ? 'before:bg-hl-cyan/20'
        : glow === 'violet'
          ? 'before:bg-hl-violet/20'
          : glow === 'amber'
            ? 'before:bg-hl-amber/20'
            : glow === 'emerald'
              ? 'before:bg-hl-emerald/20'
              : ''

  return (
    <motion.div
      whileHover={
        interactive && !prefersReducedMotion ? { y: -4, transition: { duration: 0.2 } } : undefined
      }
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-glass-line bg-glass/55 p-5 shadow-e2 backdrop-blur-xl sm:p-6',
        'before:pointer-events-none before:absolute before:-right-10 before:-top-10 before:size-36 before:rounded-full before:blur-3xl before:opacity-70 before:content-[""]',
        glowClass,
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(120% 80% at 20% 0%, rgb(18 214 160 / 0.12) 0%, transparent 55%)',
        }}
        aria-hidden
      />
      <div className="relative z-[1]">{children}</div>
    </motion.div>
  )
}

export function SubHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-6 max-w-2xl sm:mb-8">
      <p className="text-overline text-accent-300">{eyebrow}</p>
      <h3 className="text-heading-lg mt-2 break-words text-fg sm:text-heading-xl lg:text-display-md">
        {title}
      </h3>
      {subtitle ? (
        <p className="mt-2 text-body-sm text-fg-muted sm:text-body-md">{subtitle}</p>
      ) : null}
    </div>
  )
}
