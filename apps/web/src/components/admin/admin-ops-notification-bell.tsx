'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ROUTES } from '@meridian/shared'
import { Bell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAdminActivity } from '@/features/admin/hooks'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

const SEEN_KEY = 'admin.ops.notifications.seenAt'

function hrefForKind(kind: string): string {
  const k = kind.toUpperCase()
  if (k.includes('DEPOSIT')) return ROUTES.admin.deposits
  if (k.includes('WITHDRAWAL')) return ROUTES.admin.withdrawals
  if (k.includes('KYC')) return ROUTES.admin.kyc
  if (k.includes('RETURN') || k.includes('DISTRIBUTION') || k.includes('PROFIT')) {
    return ROUTES.admin.dailyReturn
  }
  if (k.includes('REGISTRATION') || k.includes('USER') || k.includes('PROFILE')) {
    return ROUTES.admin.users
  }
  if (k.includes('EMAIL') || k.includes('MAIL')) return ROUTES.admin.emails
  if (k.includes('ERROR') || k.includes('CRASH') || k.includes('SYSTEM')) {
    return ROUTES.admin.systemHealth
  }
  return ROUTES.admin.activity
}

export function AdminOpsNotificationBell() {
  const { data, dataUpdatedAt } = useAdminActivity(undefined, { refetchInterval: 15_000 })
  const [open, setOpen] = useState(false)
  const [seenAt, setSeenAt] = useState<number>(() => {
    if (typeof window === 'undefined') return Date.now()
    const raw = window.localStorage.getItem(SEEN_KEY)
    return raw ? Number(raw) || Date.now() : Date.now()
  })

  const items = data?.items ?? []
  const unread = useMemo(
    () => items.filter((item) => +new Date(item.at) > seenAt).length,
    [items, seenAt],
  )

  useEffect(() => {
    if (!open) return
    const now = Date.now()
    setSeenAt(now)
    window.localStorage.setItem(SEEN_KEY, String(now))
  }, [open, dataUpdatedAt])

  const badge = unread > 99 ? '99+' : unread > 0 ? String(unread) : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="relative size-9 shrink-0"
          aria-label={badge ? `Notifications, ${unread} new` : 'Notifications'}
        >
          <Bell className="size-4" aria-hidden />
          {badge ? (
            <span className="absolute right-0.5 top-0.5" aria-hidden>
              <span className="absolute inset-0 animate-ping rounded-full bg-accent/40" />
              <span
                className={cn(
                  'relative grid h-4 min-w-4 place-items-center rounded-full',
                  'bg-accent px-1 text-[9px] font-bold leading-none text-accent-foreground',
                  'ring-2 ring-base',
                )}
              >
                {badge}
              </span>
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
          <p className="text-body-sm font-medium text-fg">Live alerts</p>
          <Link
            href={ROUTES.admin.activity}
            className="text-caption text-accent-300 hover:underline"
            onClick={() => setOpen(false)}
          >
            Activity center
          </Link>
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <li className="px-3 py-8 text-center text-caption text-fg-muted">No alerts yet</li>
          ) : (
            items.slice(0, 12).map((item) => {
              const fresh = +new Date(item.at) > seenAt - 1000
              return (
                <li key={item.id}>
                  <Link
                    href={hrefForKind(item.kind)}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'block border-b border-white/[0.04] px-3 py-2.5 transition-colors hover:bg-white/[0.04]',
                      fresh && 'bg-accent-500/5',
                    )}
                  >
                    <p className="text-[10px] tabular-nums text-fg-subtle">
                      {formatDateTime(item.at)}
                    </p>
                    <p className="mt-0.5 text-caption font-medium text-fg">{item.title}</p>
                    {item.description ? (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-fg-muted">
                        {item.description}
                      </p>
                    ) : null}
                  </Link>
                </li>
              )
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
