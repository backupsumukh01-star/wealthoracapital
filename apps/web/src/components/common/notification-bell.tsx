'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { Bell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { formatUnreadBadge, useNotifications } from '@/providers/notifications-provider'

export interface NotificationBellProps {
  /** Override — defaults to live unread count from notifications store. */
  unreadCount?: number
  className?: string
  /** When set, opens a panel instead of navigating. */
  onOpen?: () => void
}

/**
 * Compact 24px bell with a live unread badge from the shared notifications store.
 */
export function NotificationBell({
  unreadCount: unreadOverride,
  className,
  onOpen,
}: NotificationBellProps) {
  const { unreadCount: liveUnread } = useNotifications()
  const unreadCount = unreadOverride ?? liveUnread
  const badge = formatUnreadBadge(unreadCount)
  const hasUnread = badge !== null
  const label = hasUnread
    ? `Notifications, ${unreadCount} unread`
    : 'Notifications, none unread'

  const inner = (
    <>
      <Bell className="size-6" strokeWidth={1.75} aria-hidden />
      {hasUnread ? (
        <span className="absolute right-1 top-1" aria-hidden>
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/50" />
          <span
            className={cn(
              'relative grid h-4 min-w-4 place-items-center rounded-full',
              'bg-accent px-1 text-[9px] font-bold leading-none text-accent-foreground',
              'ring-2 ring-base shadow-[0_0_10px_rgba(18,214,160,0.45)]',
            )}
          >
            {badge}
          </span>
        </span>
      ) : null}
    </>
  )

  const btnClass = cn(
    'relative size-10 shrink-0 rounded-full p-0',
    'transition-transform duration-200 ease-out',
    'hover:scale-105 hover:bg-hover/80',
    'active:scale-95',
    '[&_svg]:size-6 [&_svg]:translate-x-0 hover:[&_svg]:translate-x-0',
    className,
  )

  if (onOpen) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={btnClass}
        aria-label={label}
        onClick={onOpen}
      >
        {inner}
      </Button>
    )
  }

  return (
    <Button asChild variant="ghost" size="icon-sm" className={btnClass} aria-label={label}>
      <Link href={ROUTES.dashboard.notifications}>{inner}</Link>
    </Button>
  )
}
