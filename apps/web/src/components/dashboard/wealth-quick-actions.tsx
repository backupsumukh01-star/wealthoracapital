'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import {
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
  href: string
  accent?: boolean
}[] = [
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

/** Secondary navigation tiles — Deposit/Withdraw live on the portfolio hero. */
export function WealthQuickActions() {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div>
      <p className="text-overline text-accent-300">Quick actions</p>
      <div className="mt-3 flex gap-3 overflow-x-auto overscroll-x-contain pb-1 snap-x-mandatory no-scrollbar sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
        {ACTIONS.map((item, i) => {
          const Icon = item.icon
          const className = cn(
            'group relative flex min-w-[140px] snap-start flex-col gap-3 overflow-hidden rounded-2xl border p-4',
            'glass glass-edge transition-all duration-200',
            'hover:-translate-y-1.5 hover:border-accent-700/40 hover:shadow-glow-soft',
            'active:translate-y-0 active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )

          return (
            <motion.div
              key={item.label}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
            >
              <Link href={item.href} className={className}>
                <span className="grid size-11 place-items-center rounded-xl bg-hover text-fg-muted transition-all duration-200 group-hover:bg-accent-500/15 group-hover:text-accent-200 group-hover:shadow-[0_0_16px_-4px_rgba(212,217,223,0.45)]">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-body-sm font-medium text-fg">{item.label}</span>
                  <span className="block text-caption text-fg-subtle">{item.description}</span>
                </span>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
