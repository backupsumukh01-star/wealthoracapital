'use client'

import { BadgeCheck, Clock3, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

import { useWalletSummary } from '@/features/wallet/hooks'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { useSession } from '@/providers/session-provider'

export function InvestmentStatus() {
  const { session } = useSession()
  const prefersReducedMotion = usePrefersReducedMotion()
  const { data: summary } = useWalletSummary({ enabled: Boolean(session) })

  const kycLabel =
    session?.user.kycStatus === 'APPROVED'
      ? 'Verified'
      : session?.user.kycStatus
        ? session.user.kycStatus.replaceAll('_', ' ')
        : 'Pending'
  const invested = Number(session?.wallet?.investedAmount ?? summary?.wallet.investedAmount ?? 0) > 0
  const todayStatus = summary?.today.status
  const settlementCopy =
    todayStatus === 'DISTRIBUTED'
      ? 'Today’s return has been credited.'
      : todayStatus === 'PENDING'
        ? 'Today’s return is pending desk settlement.'
        : 'Daily returns settle after the trading day closes.'

  return (
    <div className="card-lift noise-overlay relative overflow-hidden rounded-3xl border border-accent-700/30 bg-gradient-to-br from-accent-500/15 via-raised/80 to-inset/90 p-5 shadow-e2">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-0 size-32 rounded-full bg-hl-cyan/15 blur-2xl"
      />
      {!prefersReducedMotion ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-8 bottom-0 size-24 rounded-full bg-accent-400/10 blur-2xl"
          animate={{ opacity: [0.35, 0.65, 0.35] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}
      <p className="inline-flex items-center gap-1.5 text-overline text-accent-300">
        <Sparkles className="size-3.5 animate-pulse" aria-hidden />
        Investment status
      </p>

      <dl className="relative mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-body-sm text-fg-muted">Account status</dt>
          <dd className="inline-flex items-center gap-1.5 text-body-sm font-medium text-profit">
            <BadgeCheck className="size-4" aria-hidden />
            {kycLabel}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-body-sm text-fg-muted">Investment status</dt>
          <dd className="text-body-sm font-medium text-accent-200">
            {invested ? 'Active' : 'Awaiting funds'}
          </dd>
        </div>
      </dl>

      <div className="relative mt-5 rounded-2xl border border-line/80 bg-inset/50 p-4">
        <div className="flex items-start gap-2">
          <Clock3 className="mt-0.5 size-3.5 shrink-0 text-fg-subtle" aria-hidden />
          <div>
            <p className="text-caption text-fg-subtle">Daily settlement</p>
            <p className="mt-1 text-body-sm text-fg">{settlementCopy}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
