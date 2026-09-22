'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ROUTES } from '@meridian/shared'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { AdminListPagination } from '@/components/admin/admin-list-pagination'
import { AdminPanel } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PermissionGate } from '@/features/auth/guards'
import { formatDateTime } from '@/lib/format'
import { adminService } from '@/services/admin.service'

type DeletedUserRow = {
  id: string
  deletionRef: string | null
  deletedUserId: string | null
  displayName: string | null
  username: string | null
  email: string | null
  deletedAt: string
  deletedBy: {
    id: string | null
    name: string | null
    email: string | null
  }
}

/** Read-only permanent-deletion audit — no restore. */
export function AdminDeletedUsersWorkspace() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const search = q.trim()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', 'deleted', { q: search, page }],
    queryFn: () =>
      adminService.deletedUsers({
        q: search.length >= 1 ? search : undefined,
        page,
        limit: 20,
      }),
  })

  const rows = useMemo(() => (data?.items ?? []) as DeletedUserRow[], [data?.items])
  const pagination = data?.pagination

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Deleted Users"
        description="Audit of permanently deleted investor accounts. Records are informational only — users and their data cannot be restored."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href={ROUTES.admin.users}>← Active users</Link>
          </Button>
        }
      />

      <PermissionGate
        permission="users.delete"
        fallback={
          <AdminPanel className="p-5 text-body-sm text-fg-muted">
            You do not have permission to view permanent deletion records.
          </AdminPanel>
        }
      >
        <AdminPanel className="p-4 sm:p-5" glow>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              className="border-white/10 bg-white/[0.04] pl-10"
              placeholder="Search name, email, deletion ID, deleted-by…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
            />
          </label>
          <p className="mt-3 text-caption text-fg-subtle">
            No balances, KYC, wallets, or financial history are retained here.
          </p>
        </AdminPanel>

        <AdminPanel className="overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-caption">
              <thead className="border-b border-white/[0.06] text-fg-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Username / Email</th>
                  <th className="px-4 py-3 font-medium">Deleted By</th>
                  <th className="px-4 py-3 font-medium">Deleted At</th>
                  <th className="px-4 py-3 font-medium">Deletion ID</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-fg-muted">
                      Loading deleted users…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-fg-muted">
                      No permanent deletions recorded yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-white/[0.04]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-fg">{row.displayName || '—'}</p>
                        <p className="font-mono text-[11px] text-fg-subtle">
                          {row.deletedUserId || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-fg">{row.username || '—'}</p>
                        <p className="text-fg-muted">{row.email || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-fg">{row.deletedBy.name || '—'}</p>
                        <p className="text-fg-subtle">{row.deletedBy.email || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-fg-muted">
                        {formatDateTime(row.deletedAt)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-fg-subtle">
                        {row.deletionRef || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-white/[0.06] md:hidden">
            {isLoading ? (
              <li className="px-4 py-6 text-caption text-fg-muted">Loading deleted users…</li>
            ) : rows.length === 0 ? (
              <li className="px-4 py-6 text-caption text-fg-muted">
                No permanent deletions recorded yet.
              </li>
            ) : (
              rows.map((row) => (
                <li key={row.id} className="space-y-1.5 px-4 py-4">
                  <p className="text-body-sm font-medium text-fg">{row.displayName || '—'}</p>
                  <p className="text-caption text-fg-muted">{row.email || '—'}</p>
                  <p className="text-caption text-fg-subtle">
                    Deleted by {row.deletedBy.name || '—'}
                  </p>
                  <p className="text-caption text-fg-subtle">{formatDateTime(row.deletedAt)}</p>
                  <p className="font-mono text-[11px] text-fg-subtle">
                    Deletion ID: {row.deletionRef || '—'}
                  </p>
                </li>
              ))
            )}
          </ul>

          {pagination ? (
            <AdminListPagination pagination={pagination} onPageChange={setPage} />
          ) : null}
        </AdminPanel>
      </PermissionGate>
    </div>
  )
}
