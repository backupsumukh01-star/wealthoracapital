'use client'

import { useMemo } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Megaphone,
  ShieldAlert,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/cn'
import { useNotifications } from '@/providers/notifications-provider'

const ICONS: Record<string, LucideIcon> = {
  DAILY_PROFIT: TrendingUp,
  DEPOSIT_APPROVED: ArrowDownToLine,
  WITHDRAWAL_APPROVED: ArrowUpFromLine,
  ANNOUNCEMENT: Megaphone,
  SECURITY: ShieldAlert,
}

const AVATAR: Record<string, string> = {
  DAILY_PROFIT: 'GZ',
  DEPOSIT_APPROVED: 'IN',
  WITHDRAWAL_APPROVED: 'OUT',
  ANNOUNCEMENT: 'AN',
  SECURITY: 'SEC',
}

export function NotificationSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { items, unreadCount, markRead, markAllRead } = useNotifications()

  const groups = useMemo(() => {
    const map = new Map<string, typeof items>()
    for (const item of items) {
      const g = item.group
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(item)
    }
    return [...map.entries()]
  }, [items])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="max-w-[min(100vw,24rem)] border-glass-line bg-[rgb(10_20_30/0.88)] backdrop-blur-2xl"
      >
        <SheetHeader className="safe-pt px-4 sm:px-5">
          <SheetTitle className="text-heading-md">Notifications</SheetTitle>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-caption text-fg-subtle" aria-live="polite">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You are caught up'}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 min-h-9 shrink-0 px-2.5"
              disabled={unreadCount === 0}
              onClick={() => markAllRead()}
            >
              Mark all read
            </Button>
          </div>
        </SheetHeader>
        <SheetBody className="space-y-5 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-5">
          {groups.map(([group, list]) => (
            <div key={group}>
              <p className="mb-2 text-overline text-fg-subtle">{group}</p>
              <ul className="space-y-2">
                {list.map((item) => {
                  const Icon = ICONS[item.type] ?? Megaphone
                  const initials = AVATAR[item.type] ?? 'GZ'
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={cn(
                          'flex w-full items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-left',
                          'transition-[background-color,border-color,opacity,font-weight] duration-200 ease-out',
                          'active:scale-[0.99]',
                          item.unread
                            ? 'border-accent-800/40 bg-accent-500/10'
                            : 'border-white/8 bg-white/[0.03] hover:bg-hover/40',
                        )}
                        onClick={() => markRead(item.id)}
                      >
                        <span
                          className="relative mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-400/90 to-hl-cyan/90 text-[9px] font-semibold text-accent-foreground"
                          aria-hidden
                        >
                          {initials.slice(0, 2)}
                          <span
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-md border border-raised transition-colors duration-200',
                              item.unread
                                ? 'bg-accent-500/30 text-accent-200'
                                : 'bg-overlay text-fg-subtle',
                            )}
                          >
                            <Icon className="size-2.5" strokeWidth={2.5} />
                          </span>
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                'truncate text-[13px] leading-snug text-fg transition-[font-weight] duration-200',
                                item.unread ? 'font-semibold' : 'font-medium',
                              )}
                            >
                              {item.title}
                            </span>
                            <span className="shrink-0 pt-0.5 text-[10px] tabular-nums text-fg-subtle">
                              {item.time}
                            </span>
                          </span>
                          <span className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-fg-muted">
                            {item.body}
                          </span>
                        </span>

                        <span
                          className={cn(
                            'mt-1.5 size-1.5 shrink-0 rounded-full bg-accent transition-opacity duration-200',
                            item.unread ? 'opacity-100' : 'opacity-0',
                          )}
                          aria-hidden={!item.unread}
                          aria-label={item.unread ? 'Unread' : undefined}
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
