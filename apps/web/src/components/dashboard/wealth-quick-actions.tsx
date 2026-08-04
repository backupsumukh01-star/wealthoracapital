'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChartNoAxesCombined,
  FileText,
  LifeBuoy,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { cn } from '@/lib/cn'

const ACTIONS: {
  label: string
  description: string
  icon: LucideIcon
  href?: string
  action?: 'deposit' | 'withdraw'
  accent?: boolean
}[] = [
  {
    label: 'Deposit',
    description: 'Add capital',
    icon: ArrowDownToLine,
    action: 'deposit',
    accent: true,
  },
  {
    label: 'Withdraw',
    description: 'Request payout',
    icon: ArrowUpFromLine,
    action: 'withdraw',
  },
  {
    label: 'Performance',
    description: 'Your returns',
    icon: ChartNoAxesCombined,
    href: ROUTES.dashboard.performance,
  },
  {
    label: 'Reports',
    description: 'Statements',
    icon: FileText,
    href: ROUTES.dashboard.transactions,
  },
  {
    label: 'Support',
    description: 'Talk to desk',
    icon: LifeBuoy,
    href: ROUTES.dashboard.support,
  },
  {
    label: 'Profile',
    description: 'Account & KYC',
    icon: UserRound,
    href: ROUTES.dashboard.settings.profile,
  },
]

export function WealthQuickActions({
  onDeposit,
  onWithdraw,
}: {
  onDeposit?: () => void
  onWithdraw?: () => void
}) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div>
      <p className="text-overline text-accent-300">Quick actions</p>
      <div className="mt-3 flex gap-3 overflow-x-auto overscroll-x-contain pb-1 snap-x-mandatory no-scrollbar sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6">
        {ACTIONS.map((item, i) => {
          const Icon = item.icon
          const className = cn(
            'group relative flex min-w-[140px] snap-start flex-col gap-3 overflow-hidden rounded-2xl border p-4',
            'glass glass-edge transition-all duration-200',
            'hover:-translate-y-1.5 hover:border-accent-700/40 hover:shadow-glow-soft',
            'active:translate-y-0 active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:opacity-0',
            'after:bg-[radial-gradient(circle_at_var(--ripple-x,50%)_var(--ripple-y,50%),rgb(255_255_255/0.2),transparent_55%)]',
            'active:after:opacity-100 after:transition-opacity after:duration-300',
            item.accent && 'border-accent-700/35 bg-accent-500/8',
          )

          const inner = (
            <>
              <span
                className={cn(
                  'grid size-11 place-items-center rounded-xl transition-all duration-200',
                  item.accent
                    ? 'bg-accent-500/20 text-accent-200'
                    : 'bg-hover text-fg-muted group-hover:bg-accent-500/15 group-hover:text-accent-200',
                  'group-hover:shadow-[0_0_16px_-4px_rgba(18,214,160,0.45)]',
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block text-body-sm font-medium text-fg">{item.label}</span>
                <span className="block text-caption text-fg-subtle">{item.description}</span>
              </span>
            </>
          )

          const wrapped = (
            <motion.div
              key={item.label}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
            >
              {item.action === 'deposit' && onDeposit ? (
                <button type="button" onClick={onDeposit} className={cn(className, 'w-full text-left')}>
                  {inner}
                </button>
              ) : item.action === 'withdraw' && onWithdraw ? (
                <button type="button" onClick={onWithdraw} className={cn(className, 'w-full text-left')}>
                  {inner}
                </button>
              ) : item.action === 'deposit' ? (
                <Link href={`${ROUTES.dashboard.wallet}?action=deposit`} className={className}>
                  {inner}
                </Link>
              ) : item.action === 'withdraw' ? (
                <Link href={`${ROUTES.dashboard.wallet}?action=withdraw`} className={className}>
                  {inner}
                </Link>
              ) : (
                <Link href={item.href!} className={className}>
                  {inner}
                </Link>
              )}
            </motion.div>
          )

          return wrapped
        })}
      </div>
    </div>
  )
}
