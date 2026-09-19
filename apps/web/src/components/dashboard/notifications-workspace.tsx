'use client'

import { useMemo } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCheck,
  Megaphone,
  ShieldAlert,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

import { PageHeader } from '@/components/common/page-header'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import {
  useNotifications,
  type AppNotification,
} from '@/providers/notifications-provider'

const ICON_MAP: Record<string, LucideIcon> = {
  DAILY_PROFIT: TrendingUp,
  DEPOSIT_APPROVED: ArrowDownToLine,
  WITHDRAWAL_APPROVED: ArrowUpFromLine,
  ANNOUNCEMENT: Megaphone,
  SECURITY: ShieldAlert,
}

export function NotificationsWorkspace() {
  const { items, unreadCount, markRead, markAllRead, archive } = useNotifications()

  const byTab = useMemo(
    () => ({
      all: items,
      unread: items.filter((i) => i.unread),
      money: items.filter((i) => i.category === 'money'),
      security: items.filter((i) => i.category === 'security'),
    }),
    [items],
  )

  function onMarkAll() {
    markAllRead()
    toast.success('All notifications marked read')
  }

  function renderList(list: AppNotification[]) {
    if (list.length === 0) {
      return (
        <PremiumEmptyState
          variant="notifications"
          title="You’re all caught up"
          description="Deposit decisions, settlements and security alerts will land here."
        />
      )
    }
    return (
      <ul className="divide-y divide-line/70">
        {list.map((item) => {
          const Icon = ICON_MAP[item.type] ?? Megaphone
          return (
            <li key={item.id}>
              <div
                className={cn(
                  'flex w-full items-start gap-2.5 px-4 py-3.5 sm:gap-3 sm:px-5 sm:py-4',
                  'transition-[background-color,opacity] duration-200 ease-out hover:bg-hover/40',
                  item.unread && 'bg-accent-500/[0.04]',
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                  onClick={() => markRead(item.id)}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-inset text-accent-300">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-body-sm font-medium text-fg">{item.title}</span>
                      {item.unread ? (
                        <span className="size-1.5 rounded-full bg-accent" aria-label="Unread" />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-caption text-fg-muted">{item.body}</span>
                    <span className="mt-1 block text-[11px] text-fg-subtle">{item.time}</span>
                  </span>
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => {
                    archive(item.id)
                    toast.success('Archived')
                  }}
                >
                  Archive
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Notifications"
        description="Deposit and withdrawal decisions, daily settlements and security alerts."
        actions={
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={onMarkAll}
            disabled={unreadCount === 0}
          >
            <CheckCheck aria-hidden />
            Mark all read
            {unreadCount > 0 ? ` (${unreadCount})` : ''}
          </Button>
        }
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="money">Money</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        {(['all', 'unread', 'money', 'security'] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card variant="glass" className="overflow-hidden">
              {renderList(byTab[tab])}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
