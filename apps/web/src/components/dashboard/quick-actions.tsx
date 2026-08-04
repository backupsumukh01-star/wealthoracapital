'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import {
  Bell,
  CandlestickChart,
  ChartNoAxesCombined,
  FileDown,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { SectionHeader } from '@/components/common/page-header'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/cn'

const ACTIONS: {
  label: string
  href: string
  icon: LucideIcon
  description: string
}[] = [
  {
    label: 'Wallet',
    href: ROUTES.dashboard.wallet,
    icon: Wallet,
    description: 'Deposit & withdraw',
  },
  {
    label: 'Trade history',
    href: ROUTES.dashboard.trades,
    icon: CandlestickChart,
    description: 'Closed positions',
  },
  {
    label: 'Performance',
    href: ROUTES.dashboard.performance,
    icon: ChartNoAxesCombined,
    description: 'Returns detail',
  },
  {
    label: 'Statement',
    href: ROUTES.dashboard.transactions,
    icon: FileDown,
    description: 'Download ledger',
  },
  {
    label: 'Notifications',
    href: ROUTES.dashboard.notifications,
    icon: Bell,
    description: 'Inbox',
  },
]

export function QuickActions() {
  return (
    <Card variant="glass" padded="md" className="h-full">
      <SectionHeader title="Quick actions" description="Common tasks, one tap away." as="h3" />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href + action.label}
              href={action.href}
              className={cn(
                'group flex flex-col gap-2 rounded-xl border border-line bg-inset/30 p-3.5',
                'transition-all duration-[160ms] hover:-translate-y-0.5 hover:border-line-strong hover:bg-hover/50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base',
              )}
            >
              <span className="grid size-9 place-items-center rounded-lg bg-accent-500/12 text-accent-300 transition-colors group-hover:bg-accent-500/20">
                <Icon className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block text-body-sm font-medium text-fg">{action.label}</span>
                <span className="block text-caption text-fg-subtle">{action.description}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}
