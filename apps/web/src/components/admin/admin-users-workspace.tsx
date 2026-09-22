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
import { AdminListPagination } from '@/components/admin/admin-list-pagination'
import { AdminPanel } from '@/components/admin/admin-panel'
import { AdminAccountPill, AdminKycPill } from '@/components/admin/admin-status-pills'
import type { AdminAccountStatus, AdminKycStatus } from '@/components/admin/admin-ui-types'
import { DualMoney } from '@/components/common/dual-money'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  loadAdminViewState,
  rememberAdminListLocation,
  restoreAdminScroll,
  saveAdminViewState,
} from '@/lib/admin-nav'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import { useAdminUsers } from '@/features/admin/hooks'
import { PermissionGate } from '@/features/auth/guards'

type FilterChip = 'all' | 'verified' | 'pending' | 'suspended' | 'rejected' | 'lookalike'

/** Admin list payload — live finance fields from API. */
type AdminUserListItem = User & {
  countryName?: string | null
  city?: string | null
  createdByAdminId?: string | null
  walletBalance?: MoneyString
  totalDeposited?: MoneyString
  totalWithdrawn?: MoneyString
  totalProfit?: MoneyString
  walletBalanceInr?: string
  totalDepositedInr?: string
  totalWithdrawnInr?: string
  totalProfitInr?: string
  walletsLabel?: string
  lastLoginAt?: string | null
}

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
  walletBalanceInr: string
  totalDepositedInr: string
  totalWithdrawnInr: string
  totalProfitInr: string
  registeredAt: string
  isLookalike: boolean
}

const FILTERS: { id: FilterChip; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'verified', label: 'Verified' },
  { id: 'pending', label: 'Pending' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'lookalike', label: 'Lookalike (not real)' },
]

function asMoney(v: string | null | undefined, fallback = '0.00'): MoneyString {
  if (v == null || v === '') return fallback as MoneyString
  return String(v) as MoneyString
}

function mapUser(u: AdminUserListItem): UserRow {
  const countryLabel =
    u.countryName?.trim() ||
    (u.country?.toUpperCase() === 'IN' ? 'India' : null) ||
    u.country?.trim() ||
    'India'
  return {
    userId: u.id,
    username: u.email.split('@')[0] || u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone?.trim() || '—',
    country: countryLabel,
    avatarInitials: userInitials(u),
    kycStatus: mapKycStatus(u.kycStatus),
    accountStatus: mapAccountStatus(u.status, u.kycStatus),
    walletBalance: asMoney(u.walletBalance),
    totalDeposited: asMoney(u.totalDeposited),
    totalWithdrawn: asMoney(u.totalWithdrawn),
    totalProfit: asMoney(u.totalProfit),
    walletBalanceInr: u.walletBalanceInr ?? '0',
    totalDepositedInr: u.totalDepositedInr ?? '0',
    totalWithdrawnInr: u.totalWithdrawnInr ?? '0',
    totalProfitInr: u.totalProfitInr ?? '0',
    registeredAt: u.createdAt,
    isLookalike: Boolean(u.createdByAdminId),
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

const VIEW_KEY = 'admin:users:view'

function serverFilters(filter: FilterChip): { status?: string; kycStatus?: string; lookalike?: boolean } {
  switch (filter) {
    case 'verified':
      return { kycStatus: 'APPROVED' }
    case 'pending':
      return { kycStatus: 'UNDER_REVIEW' }
    case 'suspended':
      return { status: 'SUSPENDED' }
    case 'rejected':
      return { kycStatus: 'REJECTED' }
    case 'lookalike':
      return { lookalike: true }
    default:
      return {}
  }
}

export function AdminUsersWorkspace() {
  const searchParams = useSearchParams()
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [filter, setFilter] = useState<FilterChip>('all')
  const [page, setPage] = useState(1)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(t)
  }, [q])

  const { data, isLoading } = useAdminUsers({
    q: debouncedQ.length >= 2 ? debouncedQ : undefined,
    page,
    limit: 20,
    ...serverFilters(filter),
  })

  useEffect(() => {
    rememberAdminListLocation()
    const saved = loadAdminViewState<{ q?: string; filter?: FilterChip; page?: number }>(VIEW_KEY)
    const fromUrl = searchParams.get('q')
    if (fromUrl) setQ(fromUrl)
    else if (saved?.q) setQ(saved.q)
    if (saved?.filter) setFilter(saved.filter)
    if (saved?.page) setPage(saved.page)
    if (saved?.scrollY != null) restoreAdminScroll(saved.scrollY)
    setHydrated(true)
  }, [searchParams])

  useEffect(() => {
    if (!hydrated) return
    const persist = () => saveAdminViewState(VIEW_KEY, { q, filter, page })
    persist()
    window.addEventListener('pagehide', persist)
    return () => {
      persist()
      window.removeEventListener('pagehide', persist)
    }
  }, [q, filter, page, hydrated])

  const rows = useMemo(
    () => ((data?.items ?? []) as AdminUserListItem[]).map(mapUser),
    [data?.items],
  )
  const pagination = data?.pagination

  const counts = useMemo(() => {
    const total = pagination?.total ?? rows.length
    return { all: total, verified: 0, pending: 0, suspended: 0, rejected: 0 }
  }, [pagination?.total, rows.length])

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Users"
        description="Live investors only. Lookalike accounts used for historical import are hidden unless you open that filter."
        actions={
          <>
            <PermissionGate permission="users.delete">
              <Button asChild variant="secondary" size="sm">
                <Link href={ROUTES.admin.deletedUsers}>Deleted users</Link>
              </Button>
            </PermissionGate>
            <PermissionGate permission="users.edit">
              <Button asChild size="sm">
                <Link href={ROUTES.admin.newUser}>Create user</Link>
              </Button>
            </PermissionGate>
            <Button asChild variant="secondary" size="sm">
              <Link href={ROUTES.admin.kyc}>KYC queue</Link>
            </Button>
          </>
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
                onClick={() => {
                  setFilter(f.id)
                  setPage(1)
                }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors',
                  active
                    ? f.id === 'lookalike'
                      ? 'border-warning/40 bg-warning/15 text-warning'
                      : 'border-accent-500/40 bg-accent-500/15 text-accent-300'
                    : 'border-white/[0.08] bg-white/[0.03] text-fg-muted hover:border-white/15 hover:text-fg',
                )}
              >
                {f.label}
                {f.id === 'all' ? (
                  <span className="ml-1.5 tabular-nums text-fg-subtle">{counts.all}</span>
                ) : null}
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-12 text-center text-fg-muted">
                    {isLoading ? 'Loading investors…' : 'No investors match this search.'}
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
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
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {u.firstName} {u.lastName}
                        {u.isLookalike ? (
                          <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning">
                            Not real
                          </span>
                        ) : null}
                      </span>
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
                      <DualMoney
                        usd={u.walletBalance}
                        inr={u.walletBalanceInr as MoneyString}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <DualMoney
                        usd={u.totalDeposited}
                        inr={u.totalDepositedInr as MoneyString}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <DualMoney
                        usd={u.totalWithdrawn}
                        inr={u.totalWithdrawnInr as MoneyString}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <DualMoney
                        usd={u.totalProfit}
                        inr={u.totalProfitInr as MoneyString}
                        size="sm"
                        signed
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">
                      {formatDateTime(u.registeredAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild size="sm" variant="ghost">
                        <Link
                          href={ROUTES.admin.user(u.userId)}
                          onClick={() => {
                            rememberAdminListLocation()
                            saveAdminViewState(VIEW_KEY, { q, filter })
                          }}
                        >
                          Open
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminListPagination pagination={pagination} onPageChange={setPage} />
      </AdminPanel>
    </div>
  )
}
