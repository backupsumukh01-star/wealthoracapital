'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ROUTES, type MoneyString, type User } from '@meridian/shared'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  mapAccountStatus,
  mapKycStatus,
  userInitials,
} from '@/components/admin/admin-api-adapters'
import { AdminPanel } from '@/components/admin/admin-panel'
import { AdminAccountPill, AdminKycPill } from '@/components/admin/admin-status-pills'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AdminAccountStatus, AdminKycStatus } from '@/lib/admin-demo-data'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import { useAdminUsers } from '@/features/admin/hooks'

type FilterChip = 'all' | 'verified' | 'pending' | 'suspended' | 'rejected'

type UserRow = {
  userId: string
  username: string
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string
  avatarInitials: string
  kycStatus: AdminKycStatus
  accountStatus: AdminAccountStatus
  walletBalance: MoneyString
  totalDeposited: MoneyString
  totalWithdrawn: MoneyString
  totalProfit: MoneyString
  registeredAt: string
}

const FILTERS: { id: FilterChip; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'verified', label: 'Verified' },
  { id: 'pending', label: 'Pending' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'rejected', label: 'Rejected' },
]

function matchesFilter(row: UserRow, filter: FilterChip) {
  const s = row.accountStatus
  switch (filter) {
    case 'verified':
      return s === 'VERIFIED'
    case 'pending':
      return s === 'PENDING_EMAIL' || s === 'PENDING_KYC' || row.kycStatus === 'UNDER_REVIEW'
    case 'suspended':
      return s === 'SUSPENDED' || s === 'RESTRICTED'
    case 'rejected':
      return s === 'REJECTED' || row.kycStatus === 'REJECTED'
    default:
      return true
  }
}

function mapUser(u: User): UserRow {
  return {
    userId: u.id,
    username: u.email.split('@')[0] || u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone ?? '—',
    country: u.country ?? '—',
    avatarInitials: userInitials(u),
    kycStatus: mapKycStatus(u.kycStatus),
    accountStatus: mapAccountStatus(u.status, u.kycStatus),
    walletBalance: '0.00' as MoneyString,
    totalDeposited: '0.00' as MoneyString,
    totalWithdrawn: '0.00' as MoneyString,
    totalProfit: '0.00' as MoneyString,
    registeredAt: u.createdAt,
  }
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-500/40 to-info/30 text-[11px] font-semibold tracking-wide text-fg ring-1 ring-white/10"
      aria-hidden
    >
      {initials}
    </span>
  )
}

export function AdminUsersWorkspace() {
  const searchParams = useSearchParams()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<FilterChip>('all')
  const { data, isLoading } = useAdminUsers(q.trim() ? { q: q.trim() } : undefined)

  useEffect(() => {
    const initial = searchParams.get('q')
    if (initial) setQ(initial)
  }, [searchParams])

  const rows = useMemo(() => (data?.items ?? []).map(mapUser), [data?.items])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((u) => {
      if (!matchesFilter(u, filter)) return false
      if (!needle) return true
      return (
        u.userId.toLowerCase().includes(needle) ||
        u.username.toLowerCase().includes(needle) ||
        u.email.toLowerCase().includes(needle) ||
        u.phone.toLowerCase().includes(needle) ||
        u.country.toLowerCase().includes(needle) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(needle)
      )
    })
  }, [q, filter, rows])

  const counts = useMemo(() => {
    const base = { all: rows.length, verified: 0, pending: 0, suspended: 0, rejected: 0 }
    for (const u of rows) {
      if (matchesFilter(u, 'verified')) base.verified += 1
      if (matchesFilter(u, 'pending')) base.pending += 1
      if (matchesFilter(u, 'suspended')) base.suspended += 1
      if (matchesFilter(u, 'rejected')) base.rejected += 1
    }
    return base
  }, [rows])

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Users"
        description="Searchable directory of investors — KYC, balances, and account state."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href={ROUTES.admin.kyc}>KYC queue ({counts.pending})</Link>
          </Button>
        }
      />

      <AdminPanel className="p-4 sm:p-5" glow>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            className="border-white/10 bg-white/[0.04] pl-10"
            placeholder="Search name, email, User ID, username, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors',
                  active
                    ? 'border-accent-500/40 bg-accent-500/15 text-accent-300'
                    : 'border-white/[0.08] bg-white/[0.03] text-fg-muted hover:border-white/15 hover:text-fg',
                )}
              >
                {f.label}
                <span className="ml-1.5 tabular-nums text-fg-subtle">{counts[f.id]}</span>
              </button>
            )
          })}
        </div>
      </AdminPanel>

      <AdminPanel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Avatar</th>
                <th className="px-4 py-3 font-medium">User ID</th>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">KYC Status</th>
                <th className="px-4 py-3 font-medium">Account Status</th>
                <th className="px-4 py-3 font-medium">Wallet Balance</th>
                <th className="px-4 py-3 font-medium">Total Deposited</th>
                <th className="px-4 py-3 font-medium">Total Withdrawn</th>
                <th className="px-4 py-3 font-medium">Total Profit</th>
                <th className="px-4 py-3 font-medium">Registration Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-12 text-center text-fg-muted">
                    {isLoading ? 'Loading investors…' : 'No investors match this search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr
                    key={u.userId}
                    className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.025]"
                  >
                    <td className="px-4 py-3">
                      <Avatar initials={u.avatarInitials} />
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-fg-muted">{u.userId}</td>
                    <td className="px-4 py-3 text-fg">@{u.username}</td>
                    <td className="px-4 py-3 font-medium text-fg">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-fg-muted">{u.email}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">{u.phone}</td>
                    <td className="px-4 py-3 text-fg-muted">{u.country}</td>
                    <td className="px-4 py-3">
                      <AdminKycPill status={u.kycStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <AdminAccountPill status={u.accountStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <Money value={u.walletBalance} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <Money value={u.totalDeposited} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <Money value={u.totalWithdrawn} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <Money value={u.totalProfit} size="sm" signed />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                      {formatDateTime(u.registeredAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={ROUTES.admin.user(u.userId)}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  )
}
