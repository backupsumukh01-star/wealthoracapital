'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { Search } from 'lucide-react'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Input } from '@/components/ui/input'
import { useAdminSearch } from '@/features/admin/hooks'
import { useAdminOs } from '@/providers/admin-os-provider'

type Hit = { id: string; kind: string; title: string; subtitle: string; href: string }

/** Cross-module admin search — users, money, CMS, tickets, emails, settings. */
export function AdminGlobalSearchWorkspace({ initialQuery = '' }: { initialQuery?: string }) {
  const { state } = useAdminOs()
  const [q, setQ] = useState(initialQuery)
  const { data: apiSearch } = useAdminSearch(q)

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (needle.length < 2) return [] as Hit[]
    const out: Hit[] = []

    for (const h of apiSearch?.hits ?? []) {
      out.push({
        id: h.id,
        kind: h.kind,
        title: h.title,
        subtitle: h.subtitle,
        href: h.href || ROUTES.admin.root,
      })
    }

    for (const t of state.trades) {
      if (`${t.id} ${t.pair} ${t.status}`.toLowerCase().includes(needle)) {
        out.push({
          id: t.id,
          kind: 'Trade',
          title: `${t.pair} ${t.direction}`,
          subtitle: t.status,
          href: ROUTES.admin.trade(t.id),
        })
      }
    }

    for (const r of state.reportDocs) {
      if (`${r.title} ${r.fileName}`.toLowerCase().includes(needle)) {
        out.push({
          id: r.id,
          kind: 'Report',
          title: r.title,
          subtitle: r.type,
          href: ROUTES.admin.reportLibrary,
        })
      }
    }

    for (const c of state.campaigns) {
      if (`${c.title} ${c.body}`.toLowerCase().includes(needle)) {
        out.push({
          id: c.id,
          kind: 'Notification',
          title: c.title,
          subtitle: c.status,
          href: ROUTES.admin.notifications,
        })
      }
    }

    for (const t of state.tickets) {
      if (`${t.subject} ${t.userLabel}`.toLowerCase().includes(needle)) {
        out.push({
          id: t.id,
          kind: 'Ticket',
          title: t.subject,
          subtitle: t.userLabel,
          href: ROUTES.admin.support,
        })
      }
    }

    for (const e of state.emailTemplates) {
      if (`${e.name} ${e.key} ${e.subject}`.toLowerCase().includes(needle)) {
        out.push({
          id: e.id,
          kind: 'Email',
          title: e.name,
          subtitle: e.subject,
          href: ROUTES.admin.emailTemplates,
        })
      }
    }

    for (const f of state.faqs) {
      if (`${f.question} ${f.answer}`.toLowerCase().includes(needle)) {
        out.push({
          id: f.id,
          kind: 'FAQ',
          title: f.question,
          subtitle: 'Content CMS',
          href: ROUTES.admin.cms.content,
        })
      }
    }

    for (const t of state.testimonials) {
      if (`${t.name} ${t.quote}`.toLowerCase().includes(needle)) {
        out.push({
          id: t.id,
          kind: 'Testimonial',
          title: t.name,
          subtitle: t.country,
          href: ROUTES.admin.cms.content,
        })
      }
    }

    for (const a of state.announcements) {
      if (`${a.title} ${a.body}`.toLowerCase().includes(needle)) {
        out.push({
          id: a.id,
          kind: 'Announcement',
          title: a.title,
          subtitle: a.status,
          href: ROUTES.admin.announcements,
        })
      }
    }

    const settingsHay = `${state.global.companyName} ${state.siteSeo.websiteName} timezone currency`
    if (settingsHay.toLowerCase().includes(needle) || 'settings'.includes(needle)) {
      out.push({
        id: 'settings',
        kind: 'Settings',
        title: 'System settings',
        subtitle: state.global.companyName,
        href: ROUTES.admin.settings.global,
      })
    }

    return out.slice(0, 60)
  }, [q, state, apiSearch])

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Global search"
        description="Search users, trades, deposits, withdrawals, reports, notifications, tickets, emails, FAQ, testimonials, announcements, and settings."
      />

      <AdminPanel>
        <div className="p-4 sm:p-5">
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type at least 2 characters…"
            prefix={<Search className="size-4" />}
            autoFocus
          />
        </div>
        <AdminPanelHeader title="Results" description={`${hits.length} matches`} />
        <ul className="divide-y divide-white/[0.04]">
          {hits.length === 0 ? (
            <li className="px-4 py-8 text-center text-caption text-fg-subtle sm:px-5">
              {q.trim().length < 2 ? 'Start typing to search the console.' : 'No matches.'}
            </li>
          ) : (
            hits.map((h) => (
              <li key={`${h.kind}-${h.id}`}>
                <Link
                  href={h.href}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03] sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-fg">{h.title}</p>
                    <p className="truncate text-caption text-fg-muted">{h.subtitle}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-fg-subtle">
                    {h.kind}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </AdminPanel>
    </div>
  )
}
