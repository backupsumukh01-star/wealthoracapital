'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { motion } from 'framer-motion'

import { FadeIn } from '@/components/motion/fade-in'
import { Button } from '@/components/ui/button'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

export function SuccessState({
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: {
  title: string
  description: ReactNode
  primaryAction?: { label: string; href: string }
  secondaryAction?: { label: string; onClick?: () => void; href?: string }
  className?: string
}) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <FadeIn className={cn('glass glass-edge min-w-0 space-y-7 rounded-2xl p-4 text-center shadow-e4 sm:p-8', className)}>
      <div className="mx-auto flex size-16 items-center justify-center">
        <motion.span
          className="relative flex size-16 items-center justify-center rounded-full bg-profit-bg text-profit shadow-glow-profit"
          initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          {!prefersReducedMotion ? (
            <motion.span
              className="absolute inset-0 rounded-full border border-profit/40"
              initial={{ scale: 0.8, opacity: 0.8 }}
              animate={{ scale: 1.45, opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              aria-hidden
            />
          ) : null}
          <Check className="size-7" strokeWidth={2.5} aria-hidden />
        </motion.span>
      </div>

      <div className="space-y-2">
        <h1 className="text-heading-xl text-fg">{title}</h1>
        <div className="break-words text-body-sm text-fg-muted sm:text-body-md">{description}</div>
      </div>

      <div className="flex flex-col gap-2.5">
        {primaryAction ? (
          <Button asChild fullWidth size="lg">
            <Link href={primaryAction.href}>{primaryAction.label}</Link>
          </Button>
        ) : null}
        {secondaryAction ? (
          secondaryAction.href ? (
            <Button asChild variant="ghost" fullWidth>
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          ) : (
            <Button type="button" variant="ghost" fullWidth onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )
        ) : null}
      </div>
    </FadeIn>
  )
}
