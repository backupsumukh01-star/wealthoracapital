'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ADMIN_ROUTE_PERMISSIONS } from '@/config/admin-route-permissions'
import { cn } from '@/lib/cn'
import { useSession } from '@/providers/session-provider'

type Action = {
  id: string
  label: string
  hint: string
  href?: string
  run?: () => void
  permission?: string | string[]
}

const ACTIONS: Action[] = [
  {
    id: 'users',
    label: 'Open Users',
    hint: 'Directory',
    href: ROUTES.admin.users,
    permission: 'users.view',
  },
  {
    id: 'deposit',
    label: 'Open Deposits',
    hint: 'Finance queue',
    href: ROUTES.admin.deposits,
    permission: 'finance.review',
  },
  {
    id: 'withdraw',
    label: 'Open Withdrawals',
    hint: 'Finance queue',
    href: ROUTES.admin.withdrawals,
    permission: 'finance.review',
  },
  {
    id: 'trade',
    label: 'Open Trades',
    hint: 'Trading desk',
    href: ROUTES.admin.trades,
    permission: 'trades.view',
  },
  {
    id: 'return',
    label: 'Publish Return',
    hint: 'Daily return engine',
    href: ROUTES.admin.dailyReturn,
    permission: 'returns.manage',
  },
  {
    id: 'notify',
    label: 'Send Notification',
    hint: 'Campaigns',
    href: ROUTES.admin.notifications,
    permission: 'notifications.view',
  },
  {
    id: 'report',
    label: 'Generate Report',
    hint: 'Ops reports',
    href: ROUTES.admin.reports,
    permission: 'reports.view',
  },
  {
    id: 'settings',
    label: 'Open Settings',
    hint: 'Global config',
    href: ROUTES.admin.settings.global,
    permission: 'settings.manage',
  },
  {
    id: 'health',
    label: 'System Health',
    hint: 'Ops',
    href: ROUTES.admin.systemHealth,
    permission: 'dashboard.view',
  },
  {
    id: 'cms',
    label: 'Landing CMS',
    hint: 'Content',
    href: ROUTES.admin.cms.landing,
    permission: 'cms.view',
  },
  {
    id: 'platform',
    label: 'Platform CMS',
    hint: 'Dashboard copy',
    href: ROUTES.admin.cms.platform,
    permission: 'cms.view',
  },
  {
    id: 'search',
    label: 'Global Search',
    hint: 'Find anything',
    href: ROUTES.admin.search,
    permission: 'users.view',
  },
  {
    id: 'activity',
    label: 'Activity Center',
    hint: 'Timeline',
    href: ROUTES.admin.activityCenter,
    permission: 'activity.view',
  },
  {
    id: 'kyc',
    label: 'KYC Queue',
    hint: 'Compliance',
    href: ROUTES.admin.kyc,
    permission: 'kyc.review',
  },
  {
    id: 'support',
    label: 'Support Desk',
    hint: 'Tickets',
    href: ROUTES.admin.support,
    permission: 'support.view',
  },
  {
    id: 'audit',
    label: 'Audit Log',
    hint: 'Governance',
    href: ROUTES.admin.auditLog,
    permission: 'audit.view',
  },
  {
    id: 'backup',
    label: 'Backup Center',
    hint: 'CMS backup',
    href: ROUTES.admin.cms.backup,
    permission: 'settings.manage',
  },
]

function actionAllowed(
  action: Action,
  can: (p: string) => boolean,
  canAny: (p: string[]) => boolean,
): boolean {
  const required =
    action.permission ??
    (action.href ? ADMIN_ROUTE_PERMISSIONS[action.href] : undefined)
  if (!required) return true
  return Array.isArray(required) ? canAny(required) : can(required)
}

/** Linear/Vercel-style command palette — Ctrl/Cmd+K. Filtered by permissions. */
export function AdminCommandPalette() {
  const router = useRouter()
  const { can, canAny } = useSession()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        setQ('')
        setActive(0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const allowed = useMemo(
    () => ACTIONS.filter((a) => actionAllowed(a, can, canAny)),
    [can, canAny],
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return allowed
    return allowed.filter(
      (a) => a.label.toLowerCase().includes(needle) || a.hint.toLowerCase().includes(needle),
    )
  }, [q, allowed])

  function run(action: Action) {
    setOpen(false)
    if (action.href) {
      router.push(action.href)
      return
    }
    action.run?.()
    toast.message(action.label)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>Jump to admin actions</DialogDescription>
        </DialogHeader>
        <div className="border-b border-white/10 p-3">
          <Input
            autoFocus
            placeholder="Type a command…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((i) => Math.min(filtered.length - 1, i + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((i) => Math.max(0, i - 1))
              } else if (e.key === 'Enter' && filtered[active]) {
                e.preventDefault()
                run(filtered[active]!)
              }
            }}
          />
          <p className="mt-2 text-[11px] text-fg-subtle">Ctrl / ⌘ + K · ↑↓ · Enter</p>
        </div>
        <ul className="max-h-80 overflow-y-auto py-2">
          {filtered.map((a, i) => (
            <li key={a.id}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-body-sm',
                  i === active ? 'bg-accent-500/15 text-fg' : 'text-fg-muted hover:bg-white/[0.04]',
                )}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(a)}
              >
                <span className="font-medium text-fg">{a.label}</span>
                <span className="text-caption text-fg-subtle">{a.hint}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-caption text-fg-subtle">No commands</li>
          ) : null}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
