'use client'

import type { ReactNode } from 'react'
import {
  BellOff,
  History,
  Inbox,
  LifeBuoy,
  Search,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/cn'

const ILLUSTRATIONS: Record<string, LucideIcon> = {
  default: Inbox,
  notifications: BellOff,
  activity: History,
  wallet: Wallet,
  support: LifeBuoy,
  search: Search,
}

/** Premium empty state — illustration + short copy, never plain text alone. */
export function PremiumEmptyState({
  title,
  description,
  action,
  className,
  variant = 'default',
}: {
  title: string
  description: string
  action?: ReactNode
  className?: string
  variant?: keyof typeof ILLUSTRATIONS
}) {
  const Icon = ILLUSTRATIONS[variant] ?? Inbox

  return (
    <div className={cn('flex flex-col items-center px-4 py-12 text-center', className)}>
      <div
        aria-hidden
        className="relative mb-5 grid size-[4.5rem] place-items-center overflow-hidden rounded-3xl border border-white/8 bg-inset/60 shadow-e2"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,rgba(212,217,223,0.32),transparent_62%)]" />
        <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        <Icon className="relative size-7 text-accent-300" strokeWidth={1.5} />
      </div>
      <p className="text-body-sm font-medium text-fg">{title}</p>
      <p className="mt-1.5 max-w-[260px] text-pretty text-caption leading-relaxed text-fg-subtle">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
