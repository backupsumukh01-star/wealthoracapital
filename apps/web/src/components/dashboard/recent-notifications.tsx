'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Megaphone,
  ShieldAlert,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

import { SectionHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import { useNotifications } from '@/providers/notifications-provider'

const ICON_MAP: Record<string, LucideIcon> = {
  DAILY_PROFIT: TrendingUp,
  DEPOSIT_APPROVED: ArrowDownToLine,
  WITHDRAWAL_APPROVED: ArrowUpFromLine,
  ANNOUNCEMENT: Megaphone,
  SECURITY: ShieldAlert,
}

export function RecentNotifications() {
  const { items, markRead } = useNotifications()
  const preview = items.slice(0, 4)

  return (
    <Card variant="glass" padded="md" className="h-full">
      <SectionHeader
        title="Recent notifications"
        description="What moved your account lately."
        as="h3"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.dashboard.notifications}>View all</Link>
          </Button>
        }
      />

      <ul className="space-y-2">
        {preview.map((item) => {
          const Icon = ICON_MAP[item.type] ?? Megaphone
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => markRead(item.id)}
                className={cn(
                  'flex w-full gap-3 rounded-xl border px-3.5 py-3 text-left transition-[background-color,border-color] duration-200 hover:bg-hover/50',
                  item.unread
                    ? 'border-accent-800/50 bg-accent-500/8'
                    : 'border-line bg-inset/25',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg transition-colors duration-200',
                    item.unread ? 'bg-accent-500/15 text-accent-300' : 'bg-hover text-fg-subtle',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        'text-body-sm text-fg transition-[font-weight] duration-200',
                        item.unread ? 'font-semibold' : 'font-medium',
                      )}
                    >
                      {item.title}
                    </span>
                    <span
                      className={cn(
                        'mt-1 size-1.5 shrink-0 rounded-full bg-accent transition-opacity duration-200',
                        item.unread ? 'opacity-100' : 'opacity-0',
                      )}
                      aria-hidden={!item.unread}
                    />
                  </span>
                  <span className="mt-0.5 block text-caption text-fg-muted">{item.body}</span>
                  <span className="mt-1.5 block text-caption text-fg-subtle">{item.time}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
