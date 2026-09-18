'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ROUTES, type MoneyString, type UserStatus } from '@meridian/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  type AdminDepositRow,
  type AdminWithdrawalRow,
  mapAccountStatus,
  mapDepositStatus,
  mapKycStatus,
  mapWithdrawalStatus,
  methodLabel,
} from '@/components/admin/admin-api-adapters'
import { AdminKycDocumentsGrid } from '@/components/admin/admin-kyc-review'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import {
  AdminAccountPill,
  AdminDepositPill,
  AdminKycPill,
  AdminWithdrawalPill,
} from '@/components/admin/admin-status-pills'
import { DualMoney } from '@/components/common/dual-money'
import { Money } from '@/components/common/money'
import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { PasswordField } from '@/components/auth/password-field'
import { adminQueryKeys, useAdminUser } from '@/features/admin/hooks'
import { PermissionGate } from '@/features/auth/guards'
import { peekAdminListLocation } from '@/lib/admin-nav'
import { formatDateTime } from '@/lib/format'
import { useSession } from '@/providers/session-provider'
import { adminService } from '@/services/admin.service'
import { kycService } from '@/services/kyc.service'

export function AdminUserDetailWorkspace() {
  const params = useParams<{ userId: string }>()
  const userId = decodeURIComponent(params.userId)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { refresh, session } = useSession()
  const { data: user, isLoading, isError } = useAdminUser(userId)
  const [noteDraft, setNoteDraft] = useState('')
  const [roleDraft, setRoleDraft] = useState<'USER' | 'ADMIN' | 'SUPER_ADMIN'>('USER')
  const [staffRoleDraft, setStaffRoleDraft] = useState<string>('')
  const [firstNameDraft, setFirstNameDraft] = useState('')
  const [lastNameDraft, setLastNameDraft] = useState('')
  const [emailDraft, setEmailDraft] = useState('')
  const [phoneDraft, setPhoneDraft] = useState('')
  const [countryDraft, setCountryDraft] = useState('IN')
  const [timezoneDraft, setTimezoneDraft] = useState('UTC')
  const [passwordDraft, setPasswordDraft] = useState('')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustDirection, setAdjustDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT')
  const [adjustReason, setAdjustReason] = useState('')

  type AdminUserDetail = NonNullable<typeof user> & {
    countryName?: string | null
    city?: string | null
    address?: string | null
    occupation?: string | null
    dateOfBirth?: string | null
    lastLoginAt?: string | null
    walletBalance?: MoneyString
    availableBalance?: MoneyString
    lockedBalance?: MoneyString
    totalDeposited?: MoneyString
    totalWithdrawn?: MoneyString
    totalProfit?: MoneyString
    investedAmount?: MoneyString
    walletBalanceInr?: string
    availableBalanceInr?: string
    totalDepositedInr?: string
    totalWithdrawnInr?: string
    totalProfitInr?: string
    bankAccounts?: Array<Record<string, unknown>>
    cryptoWallets?: Array<Record<string, unknown>>
    profitDistributions?: Array<{
      id: string
      date: string
      amount: string
      returnPct: string
    }>
    supportTickets?: Array<{
      id: string
      subject: string
      status: string
      priority: string
      createdAt: string
    }>
    loginHistory?: Array<{
      id: string
      ip: string | null
      userAgent: string | null
      createdAt: string
      lastUsedAt: string
      active: boolean
    }>
    activityTimeline?: Array<{
      id: string
      kind: string
      title: string
      description: string | null
      at: string
    }>
    adminNotes?: Array<{
      id: string
      body: string
      createdAt: string
      author: { id: string; name: string; email: string } | null
    }>
    transactionHistory?: Array<{
      id: string
      event: string
      status: string | null
      amount: string | null
      currency: string | null
      message: string | null
      createdAt: string
    }>
    deposits?: AdminDepositRow[]
    withdrawals?: AdminWithdrawalRow[]
    trades?: Array<{
      id: string
      pair?: string
      direction?: string
      date?: string
      entryPrice?: string
      exitPrice?: string | null
      returnPct?: string | null
    }>
  }

  const detail = user as AdminUserDetail | undefined

  useEffect(() => {
    if (!user) return
    setRoleDraft(user.role)
    setStaffRoleDraft(user.staffRole ?? '')
    setFirstNameDraft(user.firstName)
    setLastNameDraft(user.lastName)
    setEmailDraft(user.email)
    setPhoneDraft(user.phone ?? '')
    setCountryDraft((user.country || 'IN').toUpperCase())
    setTimezoneDraft(user.timezone || 'UTC')
  }, [user])

  const { data: kycDetail, isLoading: kycLoading } = useQuery({
    queryKey: ['admin', 'kyc', userId],
    queryFn: () => kycService.adminGet(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  function goBackToUsers() {
    const remembered = peekAdminListLocation()
    if (remembered?.startsWith('/admin/users') || remembered?.startsWith('/admin/kyc')) {
      router.push(remembered)
      return
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(ROUTES.admin.users)
  }

  const suspend = useMutation({
    mutationFn: () => adminService.suspendUser(userId, 'Suspended by operator'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      toast.message('Account suspended — sessions revoked')
    },
    onError: (err: Error) => toast.error(err.message || 'Suspend failed'),
  })

  const updateRoles = useMutation({
    mutationFn: () =>
      adminService.updateUser(userId, {
        role: roleDraft,
        staffRole: staffRoleDraft === '' ? null : (staffRoleDraft as NonNullable<typeof user>['staffRole']),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      toast.success('Roles updated — all sessions for this user were revoked')
      if (session?.user.id === userId) {
        refresh()
      }
    },
    onError: (err: Error) => toast.error(err.message || 'Role update failed'),
  })

  const saveProfile = useMutation({
    mutationFn: () =>
      adminService.updateUser(userId, {
        firstName: firstNameDraft.trim(),
        lastName: lastNameDraft.trim(),
        email: emailDraft.trim().toLowerCase(),
        phone: phoneDraft.trim() ? phoneDraft.trim() : null,
        country: countryDraft || 'IN',
        timezone: timezoneDraft.trim() || 'UTC',
        ...(passwordDraft.trim() ? { password: passwordDraft } : {}),
      }),
    onSuccess: () => {
      setPasswordDraft('')
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      toast.success('User details saved')
    },
    onError: (err: Error) => toast.error(err.message || 'Could not save user'),
  })

  const adjustWallet = useMutation({
    mutationFn: () => {
      const numeric = Number.parseFloat(adjustAmount)
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return Promise.reject(new Error('Enter a positive amount'))
      }
      if (!adjustReason.trim()) {
        return Promise.reject(new Error('A reason is required'))
      }
      return adminService.adjustWallet(userId, {
        amount: Math.abs(numeric).toFixed(2),
        direction: adjustDirection,
        reason: adjustReason.trim(),
      })
    },
    onSuccess: () => {
      setAdjustAmount('')
      setAdjustReason('')
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      toast.success('Wallet adjusted')
    },
    onError: (err: Error) => toast.error(err.message || 'Wallet adjust failed'),
  })

  const forceLogout = useMutation({
    mutationFn: () => adminService.forceLogoutUser(userId),
    onSuccess: (res) => {
      toast.success(`Force logout complete — ${res.revokedSessions} session(s) revoked`)
    },
    onError: (err: Error) => toast.error(err.message || 'Force logout failed'),
  })

  const enable = useMutation({
    mutationFn: () => adminService.enableUser(userId, 'Re-enabled by operator'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      toast.success('Account activated')
    },
    onError: (err: Error) => toast.error(err.message || 'Activate failed'),
  })

  const softDelete = useMutation({
    mutationFn: () =>
      adminService.deleteUser(userId, {
        mode: 'soft',
        reason: 'Soft-deleted by operator',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.ops() })
      toast.success('User soft-deleted — login disabled, records retained')
    },
    onError: (err: Error) => toast.error(err.message || 'Soft delete failed'),
  })

  const hardDelete = useMutation({
    mutationFn: () =>
      adminService.deleteUser(userId, {
        mode: 'hard',
        reason: 'Hard-deleted by super admin',
      }),
    onSuccess: () => {
      toast.success('User permanently deleted — email and phone released')
      window.location.href = ROUTES.admin.users
    },
    onError: (err: Error) => toast.error(err.message || 'Hard delete failed'),
  })

  const restoreUser = useMutation({
    mutationFn: () => adminService.restoreUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.ops() })
      toast.success('User restored')
    },
    onError: (err: Error) => toast.error(err.message || 'Restore failed'),
  })

  const approveKyc = useMutation({
    mutationFn: () => kycService.adminApprove(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.ops() })
      toast.success('KYC approved')
    },
    onError: (err: Error) => toast.error(err.message || 'KYC approve failed'),
  })

  const rejectKyc = useMutation({
    mutationFn: (reason: string) => kycService.adminReject(userId, { reason }),
    onSuccess: (_data, reason) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.ops() })
      toast.message('KYC rejected', { description: reason })
    },
    onError: (err: Error) => toast.error(err.message || 'KYC reject failed'),
  })

  const requestInfo = useMutation({
    mutationFn: (reason: string) => kycService.adminRequestInformation(userId, { reason }),
    onSuccess: (_data, reason) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.ops() })
      toast.message('Resubmission requested', { description: reason })
    },
    onError: (err: Error) => toast.error(err.message || 'Request info failed'),
  })

  const addNote = useMutation({
    mutationFn: () => adminService.addUserNote(userId, noteDraft.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      setNoteDraft('')
      toast.success('Admin note saved')
    },
    onError: (err: Error) => toast.error(err.message || 'Could not save note'),
  })

  const deposits = (detail?.deposits ?? []) as AdminDepositRow[]
  const withdrawals = (detail?.withdrawals ?? []) as AdminWithdrawalRow[]
  const returns = detail?.profitDistributions ?? []
  const trades = (detail?.trades ?? []) as Array<{
    id: string
    pair?: string
    direction?: string
    date?: string
    entryPrice?: string
    exitPrice?: string | null
    returnPct?: string | null
  }>
  const timeline = detail?.activityTimeline ?? []
  const adminNotes = detail?.adminNotes ?? []
  const txHistory = detail?.transactionHistory ?? []

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="User profile" description="Loading investor…" />
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="space-y-4">
        <PageHeader title="User not found" description={`No investor matches ${userId}.`} />
        <Button type="button" variant="secondary" onClick={goBackToUsers}>
          Back to users
        </Button>
      </div>
    )
  }

  const kycStatus = mapKycStatus(user.kycStatus)
  const accountStatus = mapAccountStatus(user.status, user.kycStatus)
  const username = user.email.split('@')[0] || user.id
  const available = (detail?.availableBalance ?? '0.00') as MoneyString
  const walletBalance = (detail?.walletBalance ?? available) as MoneyString
  const lockedBalance = (detail?.lockedBalance ?? '0.00') as MoneyString
  const ledgerBalance = (detail?.walletBalance ?? '0.00') as MoneyString
  const kycDocuments = (kycDetail?.documents ?? []) as Array<{
    id: string
    kind?: string
    documentType?: string
    side?: string
    mimeType?: string
    originalName?: string
    downloadUrl?: string
    storageKey?: string
    fileExists?: boolean
    absolutePath?: string | null
    status?: string
  }>
  const kycOwnerId = userId
  const countryLabel =
    detail?.countryName?.trim() ||
    (user.country?.toUpperCase() === 'IN' ? 'India' : null) ||
    user.country?.trim() ||
    'India'

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        description="Full investor profile — KYC, wallet, ledger activity, and operator controls."
        eyebrow={
          <button type="button" onClick={goBackToUsers} className="hover:text-fg">
            ← Users
          </button>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AdminKycPill status={kycStatus} />
            <AdminAccountPill status={accountStatus} />
            {user.status === ('SUSPENDED' satisfies UserStatus) || user.status === 'BLOCKED' ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={enable.isPending}
                onClick={() => enable.mutate()}
              >
                <CheckCircle2 aria-hidden />
                Activate
              </Button>
            ) : (
              <Button
                size="sm"
                variant="danger"
                disabled={suspend.isPending}
                onClick={() => suspend.mutate()}
              >
                <Ban aria-hidden />
                Suspend
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="trades">Trade History</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Admin Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Wallet balance',
                node: (
                  <DualMoney
                    usd={walletBalance}
                    inr={(detail?.walletBalanceInr ?? null) as MoneyString | null}
                    size="md"
                  />
                ),
              },
              {
                label: 'Locked balance',
                node: <Money value={lockedBalance} size="md" />,
              },
              {
                label: 'Ledger balance',
                node: <Money value={ledgerBalance} size="md" />,
              },
              {
                label: 'Email verified',
                node: (
                  <p className="text-body-sm font-medium text-fg">
                    {user.emailVerified ? 'Yes' : 'No'}
                  </p>
                ),
              },
            ].map((s) => (
              <AdminPanel key={s.label} className="p-4" glow>
                <p className="text-caption text-fg-muted">{s.label}</p>
                <div className="mt-2">{s.node}</div>
              </AdminPanel>
            ))}
          </div>

          <AdminPanel>
            <AdminPanelHeader
              title="Personal details"
              description="Edit the investor record. They keep using the same login page."
            />
            <PermissionGate
              permission="users.edit"
              fallback={
                <dl className="grid gap-3 px-4 py-4 text-caption sm:grid-cols-2 sm:px-5">
                  {(
                    [
                      ['User ID', user.id],
                      ['Username', `@${username}`],
                      ['Email', user.email],
                      ['Phone', user.phone ?? '—'],
                      ['Country', countryLabel],
                      ['City', detail?.city ?? '—'],
                      ['Address', detail?.address ?? '—'],
                      ['Occupation', detail?.occupation ?? '—'],
                      ['Date of birth', detail?.dateOfBirth ?? '—'],
                      ['Timezone', user.timezone],
                      ['Role', user.role],
                      ['Staff role', user.staffRole ?? '—'],
                      ['Registered', formatDateTime(user.createdAt)],
                      ['Last login', detail?.lastLoginAt ? formatDateTime(detail.lastLoginAt) : '—'],
                    ] as Array<[string, string]>
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-fg-subtle">{k}</dt>
                      <dd className="mt-0.5 text-fg">{v}</dd>
                    </div>
                  ))}
                </dl>
              }
            >
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                <FormField label="First name" required>
                  <Input value={firstNameDraft} onChange={(e) => setFirstNameDraft(e.target.value)} />
                </FormField>
                <FormField label="Last name" required>
                  <Input value={lastNameDraft} onChange={(e) => setLastNameDraft(e.target.value)} />
                </FormField>
                <FormField label="Email" required>
                  <Input type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} />
                </FormField>
                <FormField label="Phone">
                  <Input type="tel" value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} />
                </FormField>
                <FormField label="Country">
                  <Input
                    maxLength={2}
                    value={countryDraft}
                    onChange={(e) => setCountryDraft(e.target.value.toUpperCase())}
                    placeholder="IN"
                  />
                </FormField>
                <FormField label="Timezone">
                  <Input value={timezoneDraft} onChange={(e) => setTimezoneDraft(e.target.value)} />
                </FormField>
                <FormField
                  label="New password"
                  hint="Leave blank to keep the current password. Same rules as registration."
                >
                  <PasswordField
                    autoComplete="new-password"
                    value={passwordDraft}
                    onChange={(e) => setPasswordDraft(e.target.value)}
                  />
                </FormField>
                <div className="grid gap-3 text-caption sm:col-span-2 sm:grid-cols-2">
                  <div>
                    <p className="text-fg-subtle">User ID</p>
                    <p className="mt-0.5 break-all font-mono text-[11px] text-fg">{user.id}</p>
                  </div>
                  <div>
                    <p className="text-fg-subtle">Username</p>
                    <p className="mt-0.5 text-fg">@{username}</p>
                  </div>
                  <div>
                    <p className="text-fg-subtle">Registered</p>
                    <p className="mt-0.5 text-fg">{formatDateTime(user.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-fg-subtle">Last login</p>
                    <p className="mt-0.5 text-fg">
                      {detail?.lastLoginAt ? formatDateTime(detail.lastLoginAt) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-fg-subtle">City</p>
                    <p className="mt-0.5 text-fg">{detail?.city ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-fg-subtle">Address</p>
                    <p className="mt-0.5 text-fg">{detail?.address ?? '—'}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end border-t border-white/[0.06] px-4 py-4 sm:px-5">
                <Button
                  type="button"
                  size="sm"
                  loading={saveProfile.isPending}
                  loadingText="Saving"
                  onClick={() => saveProfile.mutate()}
                >
                  Save details
                </Button>
              </div>
            </PermissionGate>
            <dl className="grid gap-3 border-t border-white/[0.06] px-4 py-4 text-caption sm:grid-cols-2 sm:px-5">
              <div>
                <dt className="text-fg-subtle">Total deposited</dt>
                <dd className="mt-0.5">
                  <DualMoney
                    usd={(detail?.totalDeposited ?? '0.00') as MoneyString}
                    inr={(detail?.totalDepositedInr ?? null) as MoneyString | null}
                    size="sm"
                  />
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Total withdrawn</dt>
                <dd className="mt-0.5">
                  <DualMoney
                    usd={(detail?.totalWithdrawn ?? '0.00') as MoneyString}
                    inr={(detail?.totalWithdrawnInr ?? null) as MoneyString | null}
                    size="sm"
                  />
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Total profit</dt>
                <dd className="mt-0.5">
                  <DualMoney
                    usd={(detail?.totalProfit ?? '0.00') as MoneyString}
                    inr={(detail?.totalProfitInr ?? null) as MoneyString | null}
                    size="sm"
                    signed
                  />
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Active investment</dt>
                <dd className="mt-0.5">
                  <Money value={(detail?.investedAmount ?? '0.00') as MoneyString} size="sm" />
                </dd>
              </div>
            </dl>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Bank accounts" />
            {(detail?.bankAccounts?.length ?? 0) === 0 ? (
              <EmptyState title="No bank accounts" description="Investor has not saved bank or UPI payout methods." />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {detail!.bankAccounts!.map((b) => (
                  <li key={String(b.id)} className="space-y-1 py-3 text-caption">
                    <p className="font-medium text-fg">{String(b.label ?? b.bankName ?? 'Bank')}</p>
                    <p className="text-fg-muted">
                      {String(b.accountHolder ?? '—')} · {String(b.bankName ?? '—')}
                    </p>
                    <p className="tabular-nums text-fg">
                      Account {String(b.accountNumber ?? b.accountNumberMasked ?? '—')}
                    </p>
                    <p className="text-fg-subtle">
                      IFSC {String(b.ifsc ?? '—')}
                      {b.upi ? ` · UPI ${String(b.upi)}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Crypto wallets" />
            {(detail?.cryptoWallets?.length ?? 0) === 0 ? (
              <EmptyState title="No crypto wallets" description="Investor has not saved crypto payout addresses." />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {detail!.cryptoWallets!.map((c) => (
                  <li key={String(c.id)} className="space-y-1 py-3 text-caption">
                    <p className="font-medium text-fg">{String(c.label ?? c.coin ?? 'Wallet')}</p>
                    <p className="text-fg-muted">
                      {String(c.network ?? '—')} · {String(c.coin ?? '—')}
                    </p>
                    <p className="break-all font-mono text-[11px] text-fg">{String(c.address ?? '—')}</p>
                    {typeof c.qrDataUrl === 'string' && c.qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.qrDataUrl} alt="Wallet QR" className="mt-2 size-24 rounded-md border border-white/10" />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Support tickets" />
            {(detail?.supportTickets?.length ?? 0) === 0 ? (
              <EmptyState title="No tickets" description="No support tickets for this investor." />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {detail!.supportTickets!.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-caption">
                    <div>
                      <p className="font-medium text-fg">{t.subject}</p>
                      <p className="text-fg-subtle">
                        {t.status} · {t.priority}
                      </p>
                    </div>
                    <p className="text-fg-subtle">{formatDateTime(t.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader title="Login history" />
            {(detail?.loginHistory?.length ?? 0) === 0 ? (
              <EmptyState title="No sessions" description="No login sessions recorded yet." />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {detail!.loginHistory!.map((s) => (
                  <li key={s.id} className="py-3 text-caption">
                    <p className="font-medium text-fg">
                      {s.ip ?? 'Unknown IP'} {s.active ? '· Active' : ''}
                    </p>
                    <p className="truncate text-fg-subtle">{s.userAgent ?? '—'}</p>
                    <p className="mt-0.5 text-fg-subtle">
                      Started {formatDateTime(s.createdAt)} · Last used {formatDateTime(s.lastUsedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </TabsContent>

        <TabsContent value="kyc" className="space-y-5">
          <AdminPanel className="space-y-5 p-4 sm:p-5" glow>
            <SectionHeader
              title="Identity documents"
              description="Live previews from investor uploads — click to zoom or download."
            />
            <AdminKycDocumentsGrid
              ownerId={kycOwnerId}
              documents={kycDocuments}
              loading={kycLoading}
            />
            <dl className="grid gap-3 text-caption sm:grid-cols-3">
              <div>
                <dt className="text-fg-subtle">KYC status</dt>
                <dd className="mt-1">
                  <AdminKycPill status={kycStatus} />
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Account</dt>
                <dd className="mt-1">
                  <AdminAccountPill status={accountStatus} />
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Documents</dt>
                <dd className="mt-0.5 text-fg-muted">
                  {kycDocuments.length > 0
                    ? `${kycDocuments.length} on file`
                    : 'No KYC submission yet'}
                </dd>
              </div>
            </dl>
            {(kycStatus === 'UNDER_REVIEW' || kycStatus === 'REJECTED') && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={approveKyc.isPending}
                  onClick={() => approveKyc.mutate()}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={rejectKyc.isPending}
                  onClick={() => {
                    const reason = window.prompt('Rejection reason') || 'Documents rejected'
                    rejectKyc.mutate(reason)
                  }}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={requestInfo.isPending}
                  onClick={() => {
                    const reason =
                      window.prompt('Resubmission note') || 'Please resubmit documents'
                    requestInfo.mutate(reason)
                  }}
                >
                  Request resubmit
                </Button>
              </div>
            )}
          </AdminPanel>
        </TabsContent>

        <TabsContent value="deposits">
          <AdminPanel>
            <AdminPanelHeader
              title="Deposits"
              description={`${deposits.length} record${deposits.length === 1 ? '' : 's'}`}
            />
            {deposits.length === 0 ? (
              <EmptyState title="No deposits" description="This investor has not submitted deposits." />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {deposits.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-fg-muted">{d.id}</p>
                      <p className="text-fg">
                        {methodLabel(d.method)} · {d.reference}
                      </p>
                      <p className="text-fg-subtle">{formatDateTime(d.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <AdminDepositPill status={mapDepositStatus(d.status)} />
                      <Money value={d.amount as MoneyString} size="sm" />
                      <Button asChild size="sm" variant="ghost">
                        <Link href={ROUTES.admin.deposit(d.id)}>Open</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </TabsContent>

        <TabsContent value="withdrawals">
          <AdminPanel>
            <AdminPanelHeader
              title="Withdrawals"
              description={`${withdrawals.length} record${withdrawals.length === 1 ? '' : 's'}`}
            />
            {withdrawals.length === 0 ? (
              <EmptyState
                title="No withdrawals"
                description="This investor has not requested withdrawals."
              />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {withdrawals.map((w) => (
                  <li
                    key={w.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-fg-muted">{w.id}</p>
                      <p className="text-fg">{w.destinationLabel}</p>
                      <p className="text-fg-subtle">{formatDateTime(w.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <AdminWithdrawalPill status={mapWithdrawalStatus(w.status)} />
                      <Money value={w.amount as MoneyString} size="sm" />
                      <Button asChild size="sm" variant="ghost">
                        <Link href={ROUTES.admin.withdrawal(w.id)}>Open</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </TabsContent>

        <TabsContent value="transactions">
          <AdminPanel>
            <AdminPanelHeader
              title="Transaction history"
              description={`${txHistory.length} ledger event${txHistory.length === 1 ? '' : 's'}`}
            />
            {txHistory.length === 0 ? (
              <EmptyState
                title="No transactions"
                description="Deposits, withdrawals, returns, and wallet adjustments will appear here."
              />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {txHistory.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-fg">{row.event}</p>
                      <p className="text-fg-subtle">
                        {row.status ?? '—'}
                        {row.message ? ` · ${row.message}` : ''}
                      </p>
                      <p className="text-fg-subtle">{formatDateTime(row.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      {row.amount ? (
                        <Money value={row.amount as MoneyString} size="sm" signed />
                      ) : (
                        <span className="text-fg-subtle">—</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </TabsContent>

        <TabsContent value="wallet">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Available balance', value: available },
              { label: 'Locked balance', value: lockedBalance },
              { label: 'Ledger balance', value: ledgerBalance },
              {
                label: 'Computed wallet (dep+profit−wd)',
                value: walletBalance,
              },
            ].map((s) => (
              <AdminPanel key={s.label} className="p-4 sm:p-5" glow>
                <p className="text-caption text-fg-muted">{s.label}</p>
                <div className="mt-2">
                  <Money value={s.value} size="md" />
                </div>
              </AdminPanel>
            ))}
          </div>
          <PermissionGate permission="finance.adjust">
            <AdminPanel>
              <AdminPanelHeader
                title="Adjust wallet"
                description="Credit or debit the investment wallet. Requires an audit reason."
              />
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                <FormField label="Amount (USD)" required>
                  <Input
                    numeric
                    inputMode="decimal"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="100.00"
                  />
                </FormField>
                <FormField label="Direction">
                  <select
                    className="h-12 w-full rounded-xl border border-line-default bg-inset/80 px-3.5 text-base text-fg"
                    value={adjustDirection}
                    onChange={(e) => setAdjustDirection(e.target.value as 'CREDIT' | 'DEBIT')}
                  >
                    <option value="CREDIT">Credit</option>
                    <option value="DEBIT">Debit</option>
                  </select>
                </FormField>
                <FormField label="Reason" className="sm:col-span-2" required>
                  <Textarea
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    rows={2}
                    placeholder="Why this adjustment is being made"
                  />
                </FormField>
              </div>
              <div className="flex justify-end border-t border-white/[0.06] px-4 py-4 sm:px-5">
                <Button
                  type="button"
                  size="sm"
                  loading={adjustWallet.isPending}
                  loadingText="Applying"
                  onClick={() => adjustWallet.mutate()}
                >
                  Apply adjustment
                </Button>
              </div>
            </AdminPanel>
          </PermissionGate>
        </TabsContent>

        <TabsContent value="returns">
          <AdminPanel>
            <AdminPanelHeader
              title="Profit distribution history"
              description="Approved return distributions credited to this investor."
            />
            {returns.length === 0 ? (
              <EmptyState
                title="No returns yet"
                description="Returns appear after the investor is verified and eligible."
              />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {returns.map((r) => {
                  const row = r as {
                    id: string
                    date: string
                    amount?: string
                    returnPct?: string
                    status?: string
                    processedWallets?: number
                    eligibleWallets?: number
                    totalDistributed?: string
                  }
                  return (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption"
                    >
                      <div>
                        <p className="font-medium text-fg">{row.date}</p>
                        <p className="text-fg-subtle">
                          {row.status
                            ? `${row.status} · ${row.processedWallets}/${row.eligibleWallets} wallets`
                            : `Distribution · ${row.returnPct ?? '—'}%`}
                        </p>
                      </div>
                      <div className="text-right">
                        {row.returnPct ? (
                          <p className="text-profit">+{row.returnPct}%</p>
                        ) : null}
                        <Money
                          value={(row.amount ?? row.totalDistributed ?? '0.00') as MoneyString}
                          size="sm"
                          className="text-fg-muted"
                          signed
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </AdminPanel>
        </TabsContent>

        <TabsContent value="trades">
          <AdminPanel>
            <AdminPanelHeader title="Trade history" description="Published platform trades from API." />
            {trades.length === 0 ? (
              <EmptyState title="No trades" description="Trades unlock after verification." />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {trades.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption"
                  >
                    <div>
                      <p className="font-medium text-fg">
                        {t.pair}{' '}
                        <span className={t.direction === 'BUY' ? 'text-profit' : 'text-loss'}>
                          {t.direction}
                        </span>
                      </p>
                      <p className="text-fg-subtle">
                        {t.date} · {t.entryPrice} → {t.exitPrice}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-profit">
                        {t.returnPct != null && t.returnPct !== '' ? `+${t.returnPct}%` : '—'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </TabsContent>

        <TabsContent value="notifications">
          <AdminPanel>
            <AdminPanelHeader
              title="Notifications"
              description="Investor notification inbox is API-backed per user; open the investor app to inspect."
            />
            <EmptyState
              title="No operator notification feed"
              description="Use Broadcasts / Email Center for outbound messages."
            />
          </AdminPanel>
        </TabsContent>

        <TabsContent value="security" className="space-y-5">
          <AdminPanel>
            <AdminPanelHeader
              title="Security"
              description="Verification state, RBAC, and session controls. Role changes revoke all JWTs."
            />
            <dl className="grid gap-3 px-4 py-4 text-caption sm:grid-cols-2 sm:px-5">
              <div>
                <dt className="text-fg-subtle">Email verified</dt>
                <dd className="mt-0.5 text-fg">{user.emailVerified ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Status</dt>
                <dd className="mt-0.5 text-fg">{user.status}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Account role</dt>
                <dd className="mt-0.5 text-fg">{user.role}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Staff role</dt>
                <dd className="mt-0.5 text-fg">{user.staffRole ?? '—'}</dd>
              </div>
            </dl>
          </AdminPanel>

          <PermissionGate permission="users.edit">
            <AdminPanel>
              <AdminPanelHeader
                title="Change roles"
                description="Super Admin only for role elevation. Changing role or staffRole invalidates every session for this user."
              />
              <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
                <FormField label="Account role">
                  <select
                    className="w-full rounded-md border border-white/10 bg-base px-3 py-2 text-body-sm text-fg"
                    value={roleDraft}
                    onChange={(e) => setRoleDraft(e.target.value as typeof roleDraft)}
                  >
                    <option value="USER">USER (Investor)</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </FormField>
                <FormField label="Staff specialty">
                  <select
                    className="w-full rounded-md border border-white/10 bg-base px-3 py-2 text-body-sm text-fg"
                    value={staffRoleDraft}
                    onChange={(e) => setStaffRoleDraft(e.target.value)}
                  >
                    <option value="">None</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="FINANCE">FINANCE</option>
                    <option value="SUPPORT">SUPPORT</option>
                    <option value="KYC">KYC</option>
                    <option value="CONTENT">CONTENT</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </FormField>
              </div>
              <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
                <Button
                  type="button"
                  size="sm"
                  disabled={updateRoles.isPending}
                  onClick={() => updateRoles.mutate()}
                >
                  Save roles & revoke sessions
                </Button>
              </div>
            </AdminPanel>
          </PermissionGate>

          <PermissionGate permission="users.suspend">
            <AdminPanel>
              <AdminPanelHeader
                title="Force logout"
                description="Revokes all refresh sessions. Hierarchy enforced: you cannot force-logout equal or higher privilege accounts."
              />
              <div className="px-4 py-4 sm:px-5">
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={forceLogout.isPending}
                  onClick={() => forceLogout.mutate()}
                >
                  Force logout all sessions
                </Button>
              </div>
            </AdminPanel>
          </PermissionGate>

          <PermissionGate permission="users.delete">
            <AdminPanel>
              <AdminPanelHeader
                title="Delete user"
                description="Soft delete disables login and keeps financial + audit records. Hard delete is SUPER_ADMIN only and permanently removes the account so email/phone can register again."
              />
              <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-5">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={softDelete.isPending || Boolean(user.deletedAt)}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Soft-delete this user? They will not be able to log in. Financial records stay.',
                      )
                    ) {
                      softDelete.mutate()
                    }
                  }}
                >
                  Soft delete
                </Button>
                {user.deletedAt ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={restoreUser.isPending}
                    onClick={() => restoreUser.mutate()}
                  >
                    Restore user
                  </Button>
                ) : null}
                <PermissionGate permission="users.delete">
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={hardDelete.isPending || session?.user.role !== 'SUPER_ADMIN'}
                    onClick={() => {
                      const typed = window.prompt(
                        'HARD DELETE is permanent. Type DELETE to confirm releasing email/phone and removing credentials.',
                      )
                      if (typed === 'DELETE') hardDelete.mutate()
                    }}
                  >
                    Hard delete
                  </Button>
                </PermissionGate>
              </div>
            </AdminPanel>
          </PermissionGate>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <AdminPanel>
            <AdminPanelHeader
              title="Account timeline"
              description="Platform activity feed filtered for this user when possible."
            />
            <ol className="relative ml-5 space-y-0 border-l border-white/10 py-2">
              {(timeline.length
                ? timeline
                : [
                    {
                      id: 'fallback',
                      at: user.createdAt,
                      title: 'Account created',
                      kind: 'ACCOUNT_CREATED',
                    },
                  ]
              ).map((e) => {
                const row = e as {
                  id: string
                  at?: string
                  createdAt?: string
                  title: string
                  kind: string
                }
                const when = row.at ?? row.createdAt ?? user.createdAt
                return (
                <li key={row.id} className="relative pb-5 pl-6 last:pb-2">
                  <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-accent-400 ring-4 ring-base" />
                  <p className="text-body-sm font-medium text-fg">{row.title}</p>
                  <p className="text-caption text-fg-muted">{row.kind}</p>
                  <p className="mt-0.5 text-[11px] tabular-nums text-fg-subtle">
                    {formatDateTime(when)}
                  </p>
                </li>
                )
              })}
            </ol>
          </AdminPanel>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <AdminPanel className="space-y-4 p-4 sm:p-5">
            <SectionHeader
              title="Admin notes"
              description="Internal operator notes — persisted on the user activity timeline."
            />
            {adminNotes.length === 0 ? (
              <p className="text-caption text-fg-muted">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {adminNotes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="whitespace-pre-wrap text-body-sm text-fg">{n.body}</p>
                    <p className="mt-1 text-[11px] text-fg-subtle">
                      {n.author?.name ?? 'Operator'} · {formatDateTime(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <FormField label="Add note">
              <Textarea
                rows={3}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Add an internal note…"
                className="border-white/10 bg-white/[0.04]"
              />
            </FormField>
            <Button
              size="sm"
              disabled={!noteDraft.trim() || addNote.isPending}
              onClick={() => addNote.mutate()}
            >
              {addNote.isPending ? 'Saving…' : 'Add note'}
            </Button>
          </AdminPanel>
        </TabsContent>
      </Tabs>
    </div>
  )
}
