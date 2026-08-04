'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

export function WalletModalShell({
  open,
  onOpenChange,
  title,
  description,
  stepLabel,
  children,
  className,
  wide,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  stepLabel?: string
  children: ReactNode
  className?: string
  wide?: boolean
}) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(92dvh,880px)] flex-col overflow-hidden p-0 sm:max-w-xl',
          'pt-0 pb-0',
          wide && 'sm:max-w-2xl',
          className,
        )}
      >
        <DialogHeader className="shrink-0 border-b border-line/70 px-4 pb-4 pt-5 sm:px-6">
          {stepLabel ? (
            <p className="text-overline text-accent-300">{stepLabel}</p>
          ) : null}
          <DialogTitle className={stepLabel ? 'mt-1' : undefined}>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepLabel ?? title}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function MethodTile({
  title,
  description,
  icon,
  onClick,
  accent,
}: {
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
  accent?: 'emerald' | 'cyan'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl border border-line p-5 text-left',
        'bg-inset/40 transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-accent-700/50 hover:bg-accent-500/8',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute -right-8 -top-8 size-28 rounded-full blur-2xl',
          accent === 'cyan' ? 'bg-hl-cyan/15' : 'bg-accent-500/15',
        )}
        aria-hidden
      />
      <span className="relative grid size-11 place-items-center rounded-xl bg-accent-500/15 text-accent-200">
        {icon}
      </span>
      <span className="relative">
        <span className="block text-body font-medium text-fg">{title}</span>
        <span className="mt-1 block text-caption text-fg-muted">{description}</span>
      </span>
    </button>
  )
}
