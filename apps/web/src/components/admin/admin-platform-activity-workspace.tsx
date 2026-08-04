'use client'

import { useMemo, useState } from 'react'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Input } from '@/components/ui/input'
import { useAdminOs } from '@/providers/admin-os-provider'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

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

/** Unified platform activity timeline for operators. */
export function AdminPlatformActivityWorkspace() {
  const { state } = useAdminOs()
  const life = useInvestorLifecycle()
  const [kind, setKind] = useState<EventKind>('ALL')
  const [q, setQ] = useState('')

  const feed = useMemo(() => {
    const items: FeedItem[] = []

    for (const a of life.accounts ?? []) {
      items.push({
        id: `u-${a.userId}`,
        kind: 'USER',
        title: 'New / updated user',
        detail: `${a.firstName} ${a.lastName} · ${a.email} · ${a.status}`,
        at: a.createdAt || new Date().toISOString(),
      })
      if (a.kycStatus && a.kycStatus !== 'NOT_STARTED') {
        items.push({
          id: `kyc-${a.userId}`,
          kind: 'KYC',
          title: `KYC ${a.kycStatus}`,
          detail: a.email,
          at: a.createdAt || new Date().toISOString(),
        })
      }
    }

    for (const d of life.deposits ?? []) {
      items.push({
        id: `d-${d.id}`,
        kind: 'DEPOSIT',
        title: `Deposit ${d.status}`,
        detail: `${d.amount} · ${d.id}`,
        at: d.submittedAt,
      })
    }

    for (const w of life.withdrawals ?? []) {
      items.push({
        id: `w-${w.id}`,
        kind: 'WITHDRAWAL',
        title: `Withdrawal ${w.status}`,
        detail: `${w.amount} · ${w.id}`,
        at: w.requestedAt,
      })
    }

    for (const t of state.trades) {
      if (t.status === 'PUBLISHED') {
        items.push({
          id: `t-${t.id}`,
          kind: 'TRADE',
          title: 'Trade published',
          detail: `${t.pair} ${t.direction} · ${t.profitPct}%`,
          at: t.publishedAt || t.createdAt,
        })
      }
    }

    if (state.performance.publishedAt) {
      items.push({
        id: 'perf',
        kind: 'RETURN',
        title: 'Performance snapshot published',
        detail: `Daily ${state.performance.dailyReturn}%`,
        at: state.performance.publishedAt,
      })
    }

    for (const t of state.tickets) {
      items.push({
        id: `tk-${t.id}`,
        kind: 'SUPPORT',
        title: `Ticket · ${t.status}`,
        detail: `${t.subject} · ${t.userLabel}`,
        at: t.createdAt,
      })
    }

    for (const a of state.audit.slice(0, 40)) {
      items.push({
        id: `aud-${a.id}`,
        kind: 'ADMIN',
        title: a.action,
        detail: `${a.admin} · ${a.user} · ${a.oldValue} → ${a.newValue}`,
        at: a.at,
      })
    }

    for (const c of state.campaigns) {
      items.push({
        id: `c-${c.id}`,
        kind: 'NOTIFY',
        title: `Campaign · ${c.status}`,
        detail: c.title,
        at: c.sentAt || c.createdAt,
      })
    }

    for (const e of state.emailTemplates.slice(0, 8)) {
      items.push({
        id: `em-${e.id}`,
        kind: 'EMAIL',
        title: 'Email template updated',
        detail: `${e.name} · ${e.subject}`,
        at: e.updatedAt,
      })
    }

    return items.sort((a, b) => (a.at < b.at ? 1 : -1))
  }, [state, life])

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
        <AdminPanelHeader title="Timeline" description={`${filtered.length} events`} />
        <ol className="relative space-y-0 border-l border-white/10 ml-6 sm:ml-8">
          {filtered.slice(0, 80).map((f) => (
            <li key={f.id} className="relative pb-5 pl-6">
              <span className="absolute -left-1.5 top-1.5 size-3 rounded-full border border-base bg-accent-400" />
              <p className="text-[11px] tabular-nums text-fg-subtle">
                {f.at.slice(0, 19).replace('T', ' ')} · {f.kind}
              </p>
              <p className="mt-0.5 font-medium text-fg">{f.title}</p>
              <p className="text-caption text-fg-muted">{f.detail}</p>
            </li>
          ))}
        </ol>
      </AdminPanel>
    </div>
  )
}
