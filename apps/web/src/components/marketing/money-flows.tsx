'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BadgeCheck,
  Banknote,
  Calculator,
  ClipboardCheck,
  FileSearch,
  Landmark,
  ShieldCheck,
  Wallet,
} from 'lucide-react'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

import { ProcessFlow } from './process-flow'

const DEPOSIT_STEPS = [
  { title: 'Deposit request', detail: 'Investor submits amount and payment rail.', icon: Banknote },
  { title: 'Compliance check', detail: 'Proof and destination ownership are verified.', icon: FileSearch },
  { title: 'Manual approval', detail: 'Operations reviews before any credit posts.', icon: ClipboardCheck },
  { title: 'Funds credited', detail: 'Ledger entry updates the wallet projection.', icon: Wallet },
]

const WITHDRAW_STEPS = [
  { title: 'Withdrawal request', detail: 'Amount locked against available balance.', icon: Landmark },
  { title: 'Identity verification', detail: 'Destination matches the account holder.', icon: ShieldCheck },
  { title: 'Risk review', detail: 'Cooldown, limits, and ledger reconcile.', icon: FileSearch },
  { title: 'Approved', detail: 'Lock converts to a completed debit.', icon: BadgeCheck },
  { title: 'Transferred', detail: 'External payout marked with a reference.', icon: Banknote },
]

const SETTLEMENT_STEPS = [
  { title: 'Trading session ends', detail: 'Open tickets close; day figure is prepared.', icon: Landmark },
  { title: 'PnL calculated', detail: 'Published trades sum to the day return %.', icon: Calculator },
  { title: 'Human review', detail: 'Operator previews the atomic distribution.', icon: ClipboardCheck },
  { title: 'Return published', detail: 'Day status moves to published / distributed.', icon: BadgeCheck },
  { title: 'Balance updated', detail: 'Eligible wallets receive profit or loss.', icon: Wallet },
]

/** Side-by-side deposit & withdrawal lifecycle cards. */
export function MoneyMovementFlows() {
  return (
    <div className="grid min-w-0 gap-5 md:grid-cols-2">
      <FlowCard
        eyebrow="Money movement"
        title="Deposit flow"
        accent="emerald"
        steps={DEPOSIT_STEPS}
      />
      <FlowCard
        eyebrow="Money movement"
        title="Withdrawal flow"
        accent="cyan"
        steps={WITHDRAW_STEPS}
      />
    </div>
  )
}

function FlowCard({
  eyebrow,
  title,
  steps,
  accent,
}: {
  eyebrow: string
  title: string
  steps: typeof DEPOSIT_STEPS
  accent: 'emerald' | 'cyan'
}) {
  return (
    <div
      className={cn(
        'min-w-0 overflow-hidden rounded-2xl border border-white/10 p-5 sm:p-6 lg:p-7',
        'bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-transparent',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl',
      )}
    >
      <p className="text-overline text-accent-300">{eyebrow}</p>
      <h3 className="mt-1 text-heading-sm text-fg">{title}</h3>
      <div className="mt-5">
        <ProcessFlow steps={steps} accent={accent} />
      </div>
    </div>
  )
}

/** Animated daily settlement cycle — advances highlight every few seconds. */
export function DailySettlementFlow() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion) return
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % SETTLEMENT_STEPS.length)
    }, 2800)
    return () => window.clearInterval(id)
  }, [prefersReducedMotion])

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 p-5 sm:p-7 lg:p-8',
        'bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-transparent',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl',
      )}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-overline text-accent-300">Settlement</p>
          <h3 className="mt-1 text-heading-sm text-fg">Daily return distribution</h3>
          <p className="mt-1 max-w-xl text-body-sm text-fg-muted">
            One atomic run per trading day — previewed by a person, then applied to every eligible
            balance.
          </p>
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={active}
            className="rounded-full border border-accent-500/40 bg-accent-500/15 px-3 py-1 text-[11px] font-medium text-accent-200"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            Step {active + 1} · {SETTLEMENT_STEPS[active]!.title}
          </motion.span>
        </AnimatePresence>
      </div>

      <ol className="grid gap-2.5 sm:grid-cols-5">
        {SETTLEMENT_STEPS.map((step, i) => {
          const Icon = step.icon
          const on = i === active
          return (
            <li key={step.title}>
              <button
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  'relative flex h-full w-full flex-col items-start gap-2 rounded-xl border px-3 py-3 text-left transition-all duration-300 sm:items-center sm:text-center',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base',
                  on
                    ? 'border-accent-500/50 bg-accent-500/12 shadow-[0_0_24px_-8px_rgba(212,217,223,0.55)]'
                    : 'border-white/[0.06] bg-white/[0.02] opacity-70 hover:opacity-100',
                )}
              >
                <span
                  className={cn(
                    'grid size-9 place-items-center rounded-lg',
                    on ? 'bg-accent-500/20 text-accent-200' : 'bg-inset text-fg-muted',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="text-[13px] font-medium text-fg">{step.title}</span>
                <span className="text-[11px] text-fg-subtle">{step.detail}</span>
                {on && !prefersReducedMotion ? (
                  <motion.span
                    className="pointer-events-none absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent-300"
                    layoutId="settlement-underline"
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  />
                ) : null}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
