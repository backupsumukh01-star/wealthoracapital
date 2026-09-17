'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

export type FlowStep = {
  title: string
  detail?: string
  icon?: LucideIcon
}

/** Premium vertical process flow — glowing connectors, no placeholders. */
export const ProcessFlow = memo(function ProcessFlow({
  steps,
  className,
  accent = 'emerald',
}: {
  steps: FlowStep[]
  className?: string
  accent?: 'emerald' | 'cyan' | 'amber'
}) {
  const prefersReducedMotion = usePrefersReducedMotion()

  const stroke =
    accent === 'cyan' ? '#AAB3BD' : accent === 'amber' ? '#C9A45C' : '#D4D9DF'
  const glow =
    accent === 'cyan'
      ? 'rgba(212,217,223,0.10)'
      : accent === 'amber'
        ? 'rgba(201,164,92,0.10)'
        : 'rgba(212,217,223,0.10)'

  return (
    <ol className={cn('relative flex flex-col gap-0', className)}>
      {steps.map((step, i) => {
        const Icon = step.icon
        const isLast = i === steps.length - 1
        return (
          <li key={step.title} className="relative flex gap-3 sm:gap-4">
            <div className="relative flex w-10 shrink-0 flex-col items-center sm:w-12">
              <motion.span
                className={cn(
                  'relative z-[1] grid size-10 place-items-center rounded-xl border sm:size-11',
                  'border-white/10 bg-gradient-to-b from-white/[0.08] to-transparent backdrop-blur-md',
                )}
                initial={prefersReducedMotion ? false : { scale: 0.85, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                style={{ boxShadow: `0 0 22px -6px ${glow}` }}
              >
                {Icon ? (
                  <Icon className="size-4 text-accent-200 sm:size-[18px]" aria-hidden />
                ) : (
                  <span className="text-[11px] font-semibold tabular-nums text-accent-200">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                )}
                {!prefersReducedMotion ? (
                  <motion.span
                    className="pointer-events-none absolute inset-0 rounded-xl"
                    style={{ boxShadow: `inset 0 0 0 1px ${stroke}33` }}
                    animate={{ opacity: [0.35, 0.85, 0.35] }}
                    transition={{ duration: 2.8, delay: i * 0.15, repeat: Infinity }}
                    aria-hidden
                  />
                ) : null}
              </motion.span>

              {!isLast ? (
                <div className="relative my-1 h-10 w-4 flex-1 sm:h-12">
                  <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-white/25 via-accent-400/40 to-white/5" />
                  {!prefersReducedMotion ? (
                    <motion.span
                      className="absolute left-1/2 size-1.5 -translate-x-1/2 rounded-full"
                      style={{
                        backgroundColor: stroke,
                        boxShadow: `0 0 8px ${glow}`,
                      }}
                      animate={{ top: ['0%', '88%'], opacity: [0.2, 1, 0.2] }}
                      transition={{
                        duration: 1.8,
                        delay: i * 0.25,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      aria-hidden
                    />
                  ) : null}
                </div>
              ) : null}
            </div>

            <motion.div
              className="min-w-0 flex-1 pb-5 sm:pb-6"
              initial={prefersReducedMotion ? false : { opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <p className="text-[15px] font-medium text-fg sm:text-body-md">{step.title}</p>
              {step.detail ? (
                <p className="mt-1 text-body-sm text-fg-muted">{step.detail}</p>
              ) : null}
            </motion.div>
          </li>
        )
      })}
    </ol>
  )
})

/** Compact horizontal flow for wider cards — wraps on mobile. */
export const ProcessFlowHorizontal = memo(function ProcessFlowHorizontal({
  steps,
  className,
}: {
  steps: FlowStep[]
  className?: string
}) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <ol
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-between sm:gap-2',
        className,
      )}
    >
      {steps.map((step, i) => {
        const Icon = step.icon
        const isLast = i === steps.length - 1
        return (
          <li key={step.title} className="flex min-w-0 flex-1 items-stretch gap-2 sm:flex-col sm:items-center">
            <motion.div
              className={cn(
                'flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10',
                'bg-gradient-to-b from-white/[0.07] to-transparent px-3 py-3 sm:flex-col sm:text-center sm:px-2.5',
              )}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-500/15 text-accent-200 shadow-[0_0_16px_-4px_rgba(212,217,223,0.55)]">
                {Icon ? <Icon className="size-4" aria-hidden /> : (
                  <span className="text-[11px] font-semibold">{i + 1}</span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-fg">{step.title}</span>
                {step.detail ? (
                  <span className="mt-0.5 block text-[11px] text-fg-subtle">{step.detail}</span>
                ) : null}
              </span>
            </motion.div>
            {!isLast ? (
              <span
                className="hidden self-center text-accent-300/70 sm:block"
                aria-hidden
              >
                <motion.span
                  className="inline-block text-lg leading-none"
                  animate={prefersReducedMotion ? undefined : { opacity: [0.35, 1, 0.35], x: [0, 3, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                >
                  →
                </motion.span>
              </span>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
})
