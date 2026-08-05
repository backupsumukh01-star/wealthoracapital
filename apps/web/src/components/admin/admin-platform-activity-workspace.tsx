'use client'

import { useMemo, useState } from 'react'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Input } from '@/components/ui/input'
import { useAdminActivity } from '@/features/admin/hooks'

type EventKind =
  | 'ALL'
  | 'USER'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'KYC'
  | 'TRADE'
  | 'RETURN'
  | 'SUPPORT'
  | 'ADMIN'
  | 'NOTIFY'
  | 'EMAIL'

type FeedItem = {
  id: string
  kind: Exclude<EventKind, 'ALL'>
  title: string
  detail: string
  at: string
}

function mapActivityKind(kind: string): Exclude<EventKind, 'ALL'> {
  const k = kind.toUpperCase()
  if (k.includes('DEPOSIT')) return 'DEPOSIT'
  if (k.includes('WITHDRAW')) return 'WITHDRAWAL'
  if (k.includes('KYC')) return 'KYC'
  if (k.includes('TRADE')) return 'TRADE'
  if (k.includes('RETURN') || k.includes('PERFORMANCE')) return 'RETURN'
  if (k.includes('USER') || k.includes('ACCOUNT')) return 'USER'
  if (k.includes('EMAIL')) return 'EMAIL'
  if (k.includes('NOTIFY') || k.includes('CAMPAIGN') || k.includes('BROADCAST')) return 'NOTIFY'
  if (k.includes('SUPPORT') || k.includes('TICKET')) return 'SUPPORT'
  return 'ADMIN'
}

/** Unified platform activity timeline for operators. */
export function AdminPlatformActivityWorkspace() {
  const { data: activityData, isLoading } = useAdminActivity()
  const [kind, setKind] = useState<EventKind>('ALL')
  const [q, setQ] = useState('')

  const feed = useMemo(() => {
    const items: FeedItem[] = []
    for (const a of activityData?.items ?? []) {
      items.push({
        id: `act-${a.id}`,
        kind: mapActivityKind(a.kind),
        title: a.title,
        detail: a.kind,
        at: a.at,
      })
    }
    return items.sort((a, b) => (a.at < b.at ? 1 : -1))
  }, [activityData])

  const filtered = feed.filter((f) => {
    if (kind !== 'ALL' && f.kind !== kind) return false
    const needle = q.trim().toLowerCase()
    if (!needle) return true
    return `${f.title} ${f.detail}`.toLowerCase().includes(needle)
  })

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Platform Activity Center"
        description="Single timeline for users, money, KYC, trades, returns, support, admin actions, notifications, and emails."
      />

      <AdminPanel>
        <div className="flex flex-wrap gap-2 border-b border-white/[0.04] px-4 py-3 sm:px-5">
          <Input
            placeholder="Filter timeline…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          {(
            [
              'ALL',
              'USER',
              'DEPOSIT',
              'WITHDRAWAL',
              'KYC',
              'TRADE',
              'RETURN',
              'SUPPORT',
              'ADMIN',
              'NOTIFY',
              'EMAIL',
            ] as EventKind[]
          ).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] uppercase tracking-wide ${
                kind === k
                  ? 'border-accent-500/40 bg-accent-500/15 text-accent-200'
                  : 'border-white/10 text-fg-subtle hover:bg-white/[0.04]'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <AdminPanelHeader
          title="Timeline"
          description={isLoading ? 'Loading…' : `${filtered.length} events`}
        />
        <ol className="relative ml-6 space-y-0 border-l border-white/10 sm:ml-8">
          {filtered.length === 0 ? (
            <li className="pb-5 pl-6 text-caption text-fg-subtle">
              {isLoading ? 'Loading activity…' : 'No activity events yet.'}
            </li>
          ) : (
            filtered.slice(0, 80).map((f) => (
              <li key={f.id} className="relative pb-5 pl-6">
                <span className="absolute -left-1.5 top-1.5 size-3 rounded-full border border-base bg-accent-400" />
                <p className="text-[11px] tabular-nums text-fg-subtle">
                  {f.at.slice(0, 19).replace('T', ' ')} · {f.kind}
                </p>
                <p className="mt-0.5 font-medium text-fg">{f.title}</p>
                <p className="text-caption text-fg-muted">{f.detail}</p>
              </li>
            ))
          )}
        </ol>
      </AdminPanel>
    </div>
  )
}
