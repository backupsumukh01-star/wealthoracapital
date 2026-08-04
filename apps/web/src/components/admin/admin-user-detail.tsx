'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ROUTES, type MoneyString } from '@meridian/shared'
import { Ban, CheckCircle2, FileImage } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import {
  AdminAccountPill,
  AdminDepositPill,
  AdminKycPill,
  AdminWithdrawalPill,
} from '@/components/admin/admin-status-pills'
import { Money } from '@/components/common/money'
import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FormField } from '@/components/ui/form-field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ADMIN_NOTIFICATIONS, ADMIN_TRADES } from '@/lib/admin-demo-data'
import { formatDateTime } from '@/lib/format'
import { useAdminOs } from '@/providers/admin-os-provider'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

function DocPanel({ label, accent }: { label: string; accent: string }) {
  return (
    <div
      className={`relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${accent} p-3`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(255_255_255/0.08),transparent_55%)]" />
      <div className="relative flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
        <FileImage className="size-3.5 text-accent-300" aria-hidden />
        {label}
      </div>
      <p className="relative text-caption text-fg-subtle">Document placeholder</p>
    </div>
  )
}

export function AdminUserDetailWorkspace() {
  const params = useParams<{ userId: string }>()
  const userId = decodeURIComponent(params.userId)
  const {
    ready,
    accounts,
    deposits: allDeposits,
    withdrawals: allWithdrawals,
    returns,
    approveKyc,
    rejectKyc,
    requestKycResubmit,
    setAccountStatus,
    addAdminNote,
  } = useInvestorLifecycle()
  const { timelineFor } = useAdminOs()
  const timeline = timelineFor(userId)
  const investor = useMemo(
    () => accounts.find((a) => a.userId === userId),
    [accounts, userId],
  )
  const [noteDraft, setNoteDraft] = useState('')

  const deposits = useMemo(
    () => allDeposits.filter((d) => d.userId === userId),
    [allDeposits, userId],
  )
  const withdrawals = useMemo(
    () => allWithdrawals.filter((w) => w.userId === userId),
    [allWithdrawals, userId],
  )

  if (!ready) {
    return (
      <div className="space-y-4">
        <PageHeader title="User profile" description="Loading investor…" />
      </div>
    )
  }

  if (!investor) {
    return (
      <div className="space-y-4">
        <PageHeader title="User not found" description={`No investor matches ${userId}.`} />
        <Button asChild variant="secondary">
          <Link href={ROUTES.admin.users}>Back to users</Link>
        </Button>
      </div>
    )
  }

  const kycStatus = investor.kycStatus
  const accountStatus = investor.status
  const showMarketLists = accountStatus === 'VERIFIED' || kycStatus === 'APPROVED'
  const country = investor.kyc?.country ?? investor.country ?? '—'
  const logins = investor.loginHistory.length > 0 ? investor.loginHistory : []

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={`${investor.firstName} ${investor.lastName}`}
        description="Full investor profile — KYC, wallet, ledger activity, and operator controls."
        eyebrow={
          <Link href={ROUTES.admin.users} className="hover:text-fg">
            ← Users
          </Link>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AdminKycPill status={kycStatus} />
            <AdminAccountPill status={accountStatus} />
            {accountStatus === 'SUSPENDED' ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setAccountStatus(
                    investor.userId,
                    kycStatus === 'APPROVED' ? 'VERIFIED' : 'PENDING_KYC',
                  )
                  toast.success('Account activated')
                }}
              >
                <CheckCircle2 aria-hidden />
                Activate
              </Button>
            ) : (
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  setAccountStatus(investor.userId, 'SUSPENDED')
                  toast.message('Account suspended')
                }}
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
                node: <Money value={investor.wallet.availableBalance as MoneyString} size="md" />,
              },
              {
                label: 'Total deposited',
                node: <Money value={investor.wallet.totalDeposited as MoneyString} size="md" />,
              },
              {
                label: 'Total withdrawn',
                node: <Money value={investor.wallet.totalWithdrawn as MoneyString} size="md" />,
              },
              {
                label: 'Total profit',
                node: <Money value={investor.wallet.totalProfit as MoneyString} size="md" signed />,
              },
            ].map((s) => (
              <AdminPanel key={s.label} className="p-4" glow>
                <p className="text-caption text-fg-muted">{s.label}</p>
                <div className="mt-2">{s.node}</div>
              </AdminPanel>
            ))}
          </div>

          <AdminPanel>
            <AdminPanelHeader title="Personal details" />
            <dl className="grid gap-3 px-4 py-4 text-caption sm:grid-cols-2 sm:px-5">
              {[
                ['User ID', investor.userId],
                ['Username', `@${investor.username}`],
                ['Email', investor.email],
                ['Phone', investor.phone],
                ['Country', country],
                ['City', investor.kyc?.city ?? '—'],
                ['Address', investor.kyc?.address ?? '—'],
                ['Occupation', investor.kyc?.occupation ?? '—'],
                ['Date of birth', investor.kyc?.dateOfBirth ?? '—'],
                ['Referral', investor.referralCode],
                ['Registered', formatDateTime(investor.createdAt)],
                [
                  'Investor since',
                  investor.investorSince ? formatDateTime(investor.investorSince) : '—',
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-fg-subtle">{k}</dt>
                  <dd className="mt-0.5 text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </AdminPanel>
        </TabsContent>

        <TabsContent value="kyc" className="space-y-5">
          <AdminPanel className="space-y-5 p-4 sm:p-5" glow>
            <SectionHeader
              title="Identity documents"
              description="Front, back, and selfie placeholders for demo review."
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <DocPanel label="Front ID" accent="from-accent-500/35 via-info/20 to-transparent" />
              <DocPanel label="Back ID" accent="from-info/30 via-accent-500/15 to-transparent" />
              <DocPanel label="Selfie" accent="from-warning/25 via-accent-500/20 to-transparent" />
            </div>
            <dl className="grid gap-3 text-caption sm:grid-cols-3">
              <div>
                <dt className="text-fg-subtle">ID type</dt>
                <dd className="text-fg">{investor.kyc?.idType?.replaceAll('_', ' ') ?? '—'}</dd>
              </div>
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
            </dl>
            {(kycStatus === 'UNDER_REVIEW' || kycStatus === 'REJECTED') && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    approveKyc(investor.userId)
                    toast.success('KYC approved')
                  }}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    const reason = window.prompt('Rejection reason') || 'Documents rejected'
                    rejectKyc(investor.userId, reason)
                    toast.message('KYC rejected', { description: reason })
                  }}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const reason = window.prompt('Resubmission note') || 'Please resubmit documents'
                    requestKycResubmit(investor.userId, reason)
                    toast.message('Resubmission requested', { description: reason })
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
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-fg-muted">{d.id}</p>
                      <p className="text-fg">
                        {d.method} · {d.reference}
                      </p>
                      <p className="text-fg-subtle">{formatDateTime(d.submittedAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <AdminDepositPill status={d.status} />
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
                  <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-fg-muted">{w.id}</p>
                      <p className="text-fg">{w.destinationDetail}</p>
                      <p className="text-fg-subtle">{formatDateTime(w.requestedAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <AdminWithdrawalPill status={w.status} />
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

        <TabsContent value="wallet">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Available balance', value: investor.wallet.availableBalance },
              { label: 'Lifetime deposited', value: investor.wallet.totalDeposited },
              { label: 'Lifetime withdrawn', value: investor.wallet.totalWithdrawn },
              { label: 'Lifetime profit', value: investor.wallet.totalProfit, signed: true },
            ].map((s) => (
              <AdminPanel key={s.label} className="p-4 sm:p-5" glow>
                <p className="text-caption text-fg-muted">{s.label}</p>
                <div className="mt-2">
                  <Money value={s.value as MoneyString} size="md" signed={s.signed} />
                </div>
              </AdminPanel>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="returns">
          <AdminPanel>
            <AdminPanelHeader title="Return history" description="Platform sessions credited to eligible wallets." />
            {!showMarketLists || returns.length === 0 ? (
              <EmptyState
                title="No returns yet"
                description="Returns appear after the investor is verified and eligible."
              />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {returns.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption">
                    <div>
                      <p className="font-medium text-fg">{r.tradingDay}</p>
                      <p className="text-fg-subtle">{r.notes}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-profit">+{r.returnPct}%</p>
                      <Money value={r.distributed as MoneyString} size="sm" className="text-fg-muted" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </TabsContent>

        <TabsContent value="trades">
          <AdminPanel>
            <AdminPanelHeader title="Trade history" description="Published session trades (platform demo)." />
            {!showMarketLists ? (
              <EmptyState title="No trades" description="Trades unlock after verification." />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {ADMIN_TRADES.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption">
                    <div>
                      <p className="font-medium text-fg">
                        {t.pair}{' '}
                        <span className={t.direction === 'LONG' ? 'text-profit' : 'text-loss'}>
                          {t.direction}
                        </span>
                      </p>
                      <p className="text-fg-subtle">
                        {t.tradingDay} · {t.entry} → {t.exit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-profit">+{t.profitPct}%</p>
                      <Money value={t.profitUsd} size="sm" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </TabsContent>

        <TabsContent value="notifications">
          <AdminPanel>
            <AdminPanelHeader title="Notifications" description="Recent platform messages (demo)." />
            <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
              {ADMIN_NOTIFICATIONS.map((n) => (
                <li key={n.id} className="py-3 text-caption">
                  <p className="font-medium text-fg">{n.title}</p>
                  <p className="mt-0.5 text-fg-muted">{n.body}</p>
                  <p className="mt-1 text-fg-subtle">
                    {n.channel} · {formatDateTime(n.createdAt)} · {n.status}
                  </p>
                </li>
              ))}
            </ul>
          </AdminPanel>
        </TabsContent>

        <TabsContent value="security">
          <AdminPanel>
            <AdminPanelHeader title="Login history" description="Recent sessions (demo)." />
            {logins.length === 0 ? (
              <EmptyState title="No sessions" description="No login history recorded yet." />
            ) : (
              <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
                {logins.map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-caption"
                  >
                    <span className="text-fg">
                      {formatDateTime(l.at)} · {l.browser}
                      {l.current ? (
                        <span className="ml-2 rounded-full border border-profit/25 bg-profit/15 px-2 py-0.5 text-[11px] text-profit">
                          Current
                        </span>
                      ) : null}
                    </span>
                    <span className="text-fg-muted">
                      {l.ip} · {l.country}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <AdminPanel>
            <AdminPanelHeader
              title="Account timeline"
              description="Every lifecycle action logged forever."
            />
            <ol className="relative space-y-0 border-l border-white/10 ml-5 py-2">
              {(timeline.length
                ? timeline
                : [
                    {
                      id: 'fallback',
                      at: investor.createdAt,
                      label: 'Account created',
                      detail: investor.email,
                      type: 'ACCOUNT_CREATED',
                      userId,
                    },
                  ]
              ).map((e) => (
                <li key={e.id} className="relative pb-5 pl-6 last:pb-2">
                  <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-accent-400 ring-4 ring-base" />
                  <p className="text-body-sm font-medium text-fg">{e.label}</p>
                  <p className="text-caption text-fg-muted">{e.detail}</p>
                  <p className="mt-0.5 text-[11px] tabular-nums text-fg-subtle">
                    {formatDateTime(e.at)}
                  </p>
                </li>
              ))}
            </ol>
          </AdminPanel>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <AdminPanel className="space-y-4 p-4 sm:p-5">
            <SectionHeader title="Admin notes" description="Internal only — not visible to the investor." />
            <ul className="space-y-2">
              {investor.adminNotes.length === 0 ? (
                <li className="text-caption text-fg-muted">No notes yet.</li>
              ) : (
                investor.adminNotes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-caption"
                  >
                    <p className="text-fg">{n.text}</p>
                    <p className="mt-1 text-fg-subtle">
                      {n.author} · {formatDateTime(n.at)}
                    </p>
                  </li>
                ))
              )}
            </ul>
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
              disabled={!noteDraft.trim()}
              onClick={() => {
                addAdminNote(investor.userId, noteDraft.trim())
                setNoteDraft('')
                toast.success('Note added')
              }}
            >
              Add note
            </Button>
          </AdminPanel>
        </TabsContent>
      </Tabs>
    </div>
  )
}
