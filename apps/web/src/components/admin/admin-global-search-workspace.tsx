'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { Search } from 'lucide-react'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Input } from '@/components/ui/input'
import { useAdminSearch } from '@/features/admin/hooks'

/** Cross-module admin search — users, money, CMS, tickets, emails, settings. */
export function AdminGlobalSearchWorkspace({ initialQuery = '' }: { initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery)
  const { data: apiSearch, isFetching } = useAdminSearch(q.trim().length >= 2 ? q : '')
  const hits = apiSearch?.hits ?? []

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
        <AdminPanelHeader
          title="Results"
          description={
            q.trim().length < 2
              ? 'Start typing'
              : isFetching
                ? 'Searching…'
                : `${hits.length} matches`
          }
        />
        <ul className="divide-y divide-white/[0.04]">
          {hits.length === 0 ? (
            <li className="px-4 py-8 text-center text-caption text-fg-subtle sm:px-5">
              {q.trim().length < 2 ? 'Start typing to search the console.' : 'No matches.'}
            </li>
          ) : (
            hits.map((h) => (
              <li key={`${h.kind}-${h.id}`}>
                <Link
                  href={h.href || ROUTES.admin.root}
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
