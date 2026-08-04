'use client'

import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Plus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

/** Mobile floating action — deposit / withdraw shortcuts. */
export function WalletFab({
  onDeposit,
  onWithdraw,
}: {
  onDeposit: () => void
  onWithdraw: () => void
}) {
  const [open, setOpen] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div
      className="pointer-events-none fixed z-[35] flex flex-col items-end gap-3 lg:hidden"
      style={{
        right: 'max(1rem, env(safe-area-inset-right))',
        bottom: 'calc(4.75rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              key="withdraw"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-line bg-raised px-4 py-2.5 text-body-sm font-medium text-fg shadow-e3"
              onClick={() => {
                setOpen(false)
                onWithdraw()
              }}
            >
              <ArrowUpFromLine className="size-4" aria-hidden />
              Withdraw
            </motion.button>
            <motion.button
              type="button"
              key="deposit"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ delay: 0.04 }}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-body-sm font-medium text-accent-foreground shadow-glow"
              onClick={() => {
                setOpen(false)
                onDeposit()
              }}
            >
              <ArrowDownToLine className="size-4" aria-hidden />
              Deposit
            </motion.button>
          </>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Close actions' : 'Open wallet actions'}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'pointer-events-auto grid size-14 place-items-center rounded-full shadow-glow transition-transform',
          'bg-gradient-to-br from-accent-400 to-accent-600 text-accent-foreground',
          open && 'rotate-45',
        )}
      >
        {open ? <X className="size-6" aria-hidden /> : <Plus className="size-6" aria-hidden />}
      </button>
    </div>
  )
}
