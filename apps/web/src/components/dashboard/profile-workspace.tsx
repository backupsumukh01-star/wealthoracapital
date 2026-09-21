'use client'

import { useMemo, useState } from 'react'
import type { KycStatus, PayoutMethod, User, UserStatus } from '@meridian/shared'
import {
  BadgeCheck,
  KeyRound,
  Landmark,
  MoreHorizontal,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  UserRound,
  Wallet,
} from 'lucide-react'

import { PageHeader } from '@/components/common/page-header'
import { AddBankAccountDialog } from '@/components/dashboard/add-bank-account-dialog'
import { AddCryptoWalletDialog } from '@/components/dashboard/add-crypto-wallet-dialog'
import { DisplayCurrencySelector } from '@/components/dashboard/display-currency-selector'
import { SettingsCard, SettingsRow } from '@/components/dashboard/settings-card'
import { StatusPill } from '@/components/dashboard/status-pill'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { LifecycleStatusBadge, KycStatusBadge } from '@/components/auth/lifecycle-status-badge'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import { useChangePassword } from '@/features/auth/hooks'
import {
  useDeletePayoutMethod,
  usePayoutMethods,
  useSetDefaultPayoutMethod,
} from '@/features/withdrawals/hooks'
import {
  displayUsername,
  type KycLifecycleStatus,
  type LifecycleStatus,
} from '@/lib/investor-lifecycle'
import { ApiError } from '@/lib/api-client'
import { formatDateTime } from '@/lib/format'
import { useSession } from '@/providers/session-provider'
import { authService } from '@/services/auth.service'
import { cn } from '@/lib/cn'

function isCryptoType(type: string) {
  return ['CRYPTO', 'USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH'].includes(type)
}

const TABS = [
  { id: 'personal', label: 'Personal', icon: UserRound },
  { id: 'bank', label: 'Bank', icon: Landmark },
  { id: 'crypto', label: 'Crypto', icon: Wallet },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'kyc', label: 'KYC', icon: BadgeCheck },
  { id: 'password', label: 'Password', icon: KeyRound },
  { id: '2fa', label: '2FA', icon: Smartphone },
] as const

function mapKycBadgeStatus(status: KycStatus | string): KycLifecycleStatus {
  switch (status) {
    case 'APPROVED':
      return 'APPROVED'
    case 'REJECTED':
      return 'REJECTED'
    case 'UNDER_REVIEW':
    case 'SUBMITTED':
    case 'PENDING':
    case 'NEED_MORE_INFO':
      return 'UNDER_REVIEW'
    default:
      return 'NOT_STARTED'
  }
}

function mapLifecycleStatus(user: User): LifecycleStatus {
  const status = user.status as UserStatus
  if (status === 'SUSPENDED' || status === 'BLOCKED') return 'SUSPENDED'
  if (!user.emailVerified) return 'PENDING_EMAIL'
  if (user.kycStatus === 'APPROVED') return 'VERIFIED'
  if (user.kycStatus === 'REJECTED') return 'REJECTED'
  return 'PENDING_KYC'
}

export function ProfileWorkspace({ showHeader = true }: { showHeader?: boolean }) {
  const { session } = useSession()
  const changePassword = useChangePassword()
  const { data: payoutMethods = [] } = usePayoutMethods({ enabled: Boolean(session) })
  const deleteMethod = useDeletePayoutMethod()
  const setDefault = useSetDefaultPayoutMethod()
  const [twoFa, setTwoFa] = useState(false)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const [editingBank, setEditingBank] = useState<PayoutMethod | null>(null)
  const [editingWallet, setEditingWallet] = useState<PayoutMethod | null>(null)

  const bankAccounts = useMemo(
    () => payoutMethods.filter((m) => !isCryptoType(m.type)),
    [payoutMethods],
  )
  const cryptoWallets = useMemo(
    () => payoutMethods.filter((m) => isCryptoType(m.type)),
    [payoutMethods],
  )

  async function onSetDefault(id: string) {
    try {
      await setDefault.mutateAsync(id)
      toast.success('Primary payout method updated')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not update primary method')
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteMethod.mutateAsync(id)
      toast.success('Payout method removed')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not remove payout method')
    }
  }

  const apiUser = session?.user
  const user = apiUser
    ? {
        firstName: apiUser.firstName,
        lastName: apiUser.lastName,
        email: apiUser.email,
        phone: apiUser.phone ?? '',
        country: apiUser.country ?? '',
        timezone: apiUser.timezone ?? '',
        userId: apiUser.id,
        username: apiUser.email.split('@')[0] ?? '',
        status: mapLifecycleStatus(apiUser),
        kycStatus: mapKycBadgeStatus(apiUser.kycStatus),
        emailVerified: apiUser.emailVerified,
        createdAt: apiUser.createdAt,
        investorSince: apiUser.createdAt,
      }
    : null

  if (!user) {
    return (
      <PremiumEmptyState
        title="Login required"
        description="Sign in to view your profile."
      />
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 sm:space-y-5 lg:space-y-6">
      {showHeader ? (
        <PageHeader
          className="pb-2 sm:pb-4"
          title="Profile"
          description="Personal details, payout destinations, KYC and account security."
        />
      ) : null}

      <Tabs defaultValue="personal" className="min-w-0 max-w-full">
        <div className="relative min-w-0">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-base to-transparent sm:hidden"
          />
          <TabsList className="no-scrollbar h-auto w-full max-w-full flex-nowrap justify-start gap-1 overflow-x-auto overscroll-x-contain rounded-xl p-1">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="shrink-0 flex-none gap-1.5 px-3 py-2 text-caption sm:text-body-sm [&_svg]:size-4"
              >
                <t.icon aria-hidden />
                <span>{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="personal" className="mt-4 space-y-4">
          <SettingsCard
            title="Display currency"
            description="Presentation only — wallet and ledger remain USD."
            icon={SlidersHorizontal}
          >
            <DisplayCurrencySelector />
          </SettingsCard>

          <SettingsCard
            title="Investor identity"
            description="Permanent User ID and username never change."
            icon={UserRound}
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <LifecycleStatusBadge status={user.status} />
              <KycStatusBadge status={user.kycStatus} />
            </div>
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-inset/40 px-3.5 py-3">
                <p className="text-caption text-fg-subtle">User ID</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-mono text-body-sm text-fg">{user.userId}</p>
                  <CopyButton value={user.userId} label="User ID" />
                </div>
              </div>
              <div className="rounded-xl border border-line bg-inset/40 px-3.5 py-3">
                <p className="text-caption text-fg-subtle">Username</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-mono text-body-sm text-fg">{displayUsername(user.username)}</p>
                  <CopyButton value={displayUsername(user.username)} label="Username" />
                </div>
              </div>
              <div className="rounded-xl border border-line bg-inset/40 px-3.5 py-3 sm:col-span-2">
                <p className="text-caption text-fg-subtle">Registration · Investor since</p>
                <p className="mt-1 text-body-sm text-fg">
                  {formatDateTime(user.createdAt)}
                  {user.investorSince ? ` · ${formatDateTime(user.investorSince)}` : ''}
                </p>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            className="mt-4"
            title="Personal info"
            description="Must match the name on accounts you send deposits from."
            icon={UserRound}
          >
            <form
              className="grid min-w-0 gap-3.5 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                toast.success('Profile saved')
              }}
            >
              <FormField label="First name" required>
                <Input defaultValue={user.firstName} />
              </FormField>
              <FormField label="Last name" required>
                <Input defaultValue={user.lastName} />
              </FormField>
              <FormField label="Email" hint="Change email requires password + OTP.">
                <Input type="email" defaultValue={user.email} />
              </FormField>
              <FormField label="Phone">
                <Input defaultValue={user.phone ?? ''} />
              </FormField>
              <FormField label="Country">
                <Input defaultValue={user.country ?? ''} />
              </FormField>
              <FormField label="Timezone">
                <Input defaultValue={user.timezone ?? ''} />
              </FormField>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full sm:w-auto">
                  Save changes
                </Button>
              </div>
            </form>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="bank" className="mt-4">
          <SettingsCard
            title="Bank details"
            description="Saved bank payout accounts."
            icon={Landmark}
          >
            {bankAccounts.length === 0 ? (
              <PremiumEmptyState
                variant="wallet"
                title="No bank accounts"
                description="Add a bank account to receive withdrawals."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingBank(null)
                      setBankOpen(true)
                    }}
                  >
                    Add bank account
                  </Button>
                }
              />
            ) : (
              <>
                <ul className="space-y-2.5">
                  {bankAccounts.map((b) => (
                    <li
                      key={b.id}
                      className={cn(
                        'rounded-xl border px-3.5 py-3',
                        b.isDefault
                          ? 'border-accent-700/40 bg-accent-500/8'
                          : 'border-line/80 bg-inset/30',
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-body-sm font-medium text-fg">
                              {b.label}
                              {b.isDefault ? (
                                <span className="ml-2 text-caption text-accent-300">Primary</span>
                              ) : null}
                            </p>
                            <StatusPill status={b.isVerified ? 'APPROVED' : 'PENDING'} />
                          </div>
                          <p className="mt-1 text-caption text-fg-muted">{b.maskedDetails}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="size-9 shrink-0 rounded-full p-0"
                              aria-label={`Manage ${b.label}`}
                            >
                              <MoreHorizontal aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                setEditingBank(b)
                                setBankOpen(true)
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            {!b.isDefault ? (
                              <DropdownMenuItem onSelect={() => void onSetDefault(b.id)}>
                                Set as primary
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem destructive onSelect={() => void onDelete(b.id)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-3.5"
                  variant="secondary"
                  onClick={() => {
                    setEditingBank(null)
                    setBankOpen(true)
                  }}
                >
                  Add bank account
                </Button>
              </>
            )}
          </SettingsCard>
        </TabsContent>

        <TabsContent value="crypto" className="mt-4">
          <SettingsCard
            title="Crypto wallets"
            description="Saved withdrawal addresses."
            icon={Wallet}
          >
            {cryptoWallets.length === 0 ? (
              <PremiumEmptyState
                variant="wallet"
                title="No wallets yet"
                description="Save a crypto address for faster withdrawals."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingWallet(null)
                      setWalletOpen(true)
                    }}
                  >
                    Add wallet
                  </Button>
                }
              />
            ) : (
              <>
                <ul className="space-y-2.5">
                  {cryptoWallets.map((w) => (
                    <li
                      key={w.id}
                      className={cn(
                        'rounded-xl border px-3.5 py-3',
                        w.isDefault
                          ? 'border-accent-700/40 bg-accent-500/8'
                          : 'border-line/80 bg-inset/30',
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-body-sm font-medium text-fg">
                              {w.label}
                              {w.isDefault ? (
                                <span className="ml-2 text-caption text-accent-300">Primary</span>
                              ) : null}
                            </p>
                            <span className="text-caption text-fg-subtle">
                              {w.type.replaceAll('_', ' ')}
                            </span>
                          </div>
                          <div className="mt-2 flex items-start gap-2">
                            <p className="min-w-0 flex-1 break-all font-mono text-caption text-fg-muted">
                              {w.maskedDetails}
                            </p>
                            <CopyButton
                              value={w.details?.address ?? w.maskedDetails}
                              label="Wallet address"
                            />
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="size-9 shrink-0 rounded-full p-0"
                              aria-label={`Manage ${w.label}`}
                            >
                              <MoreHorizontal aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                setEditingWallet(w)
                                setWalletOpen(true)
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            {!w.isDefault ? (
                              <DropdownMenuItem onSelect={() => void onSetDefault(w.id)}>
                                Set as primary
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem destructive onSelect={() => void onDelete(w.id)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-3.5"
                  variant="secondary"
                  onClick={() => {
                    setEditingWallet(null)
                    setWalletOpen(true)
                  }}
                >
                  Add wallet
                </Button>
              </>
            )}
          </SettingsCard>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <SettingsCard
            title="Security overview"
            description="Sessions and account hardening."
            icon={ShieldCheck}
          >
            <div className="space-y-2.5">
              <SettingsRow
                label="Email verified"
                value={
                  <span className={user.emailVerified ? 'text-profit' : 'text-warning'}>
                    {user.emailVerified ? 'Yes' : 'No'}
                  </span>
                }
              />
              <SettingsRow label="Two-factor authentication" value={twoFa ? 'Enabled' : 'Off'} />
              <SettingsRow label="Active sessions" value="1 (this device)" />
            </div>
            <Button
              className="mt-3.5"
              variant="secondary"
              onClick={() => {
                void authService
                  .terminateOtherSessions()
                  .then((data) => {
                    toast.success(
                      data.revokedSessions > 0
                        ? `Signed out ${data.revokedSessions} other device${data.revokedSessions === 1 ? '' : 's'}`
                        : 'No other sessions were active',
                    )
                  })
                  .catch((error: unknown) => {
                    toast.error(
                      error instanceof ApiError
                        ? error.message
                        : error instanceof Error
                          ? error.message
                          : 'Could not sign out other devices',
                    )
                  })
              }}
            >
              Sign out other devices
            </Button>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="kyc" className="mt-4">
          <SettingsCard
            title="KYC verification"
            description="Identity status for deposits and higher withdrawal limits."
            icon={BadgeCheck}
          >
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-inset/40 px-3.5 py-3.5">
              <BadgeCheck className="size-5 text-accent-300" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <KycStatusBadge status={user.kycStatus} />
                  <LifecycleStatusBadge status={user.status} />
                </div>
                <p className="mt-1 text-caption text-fg-muted">
                  Deposit & withdraw require Verified + KYC Approved.
                </p>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="password" className="mt-4">
          <SettingsCard
            title="Change password"
            description="Requires your current password and a new password."
            icon={KeyRound}
          >
            <form
              className="max-w-md space-y-3.5"
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const currentPassword = String(fd.get('current') ?? '')
                const newPassword = String(fd.get('next') ?? '')
                const confirm = String(fd.get('confirm') ?? '')
                if (newPassword !== confirm) {
                  toast.error('Passwords do not match')
                  return
                }
                setPasswordBusy(true)
                void changePassword
                  .mutateAsync({ currentPassword, newPassword })
                  .then(() => {
                    toast.success('Password updated')
                    e.currentTarget.reset()
                  })
                  .catch((error: unknown) => {
                    toast.error(
                      error instanceof ApiError
                        ? error.message
                        : error instanceof Error
                          ? error.message
                          : 'Could not update password',
                    )
                  })
                  .finally(() => setPasswordBusy(false))
              }}
            >
              <FormField label="Current password" required>
                <Input name="current" type="password" autoComplete="current-password" />
              </FormField>
              <FormField label="New password" required>
                <Input name="next" type="password" autoComplete="new-password" />
              </FormField>
              <FormField label="Confirm new password" required>
                <Input name="confirm" type="password" autoComplete="new-password" />
              </FormField>
              <Button type="submit" loading={passwordBusy}>
                Update password
              </Button>
            </form>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="2fa" className="mt-4">
          <SettingsCard
            title="Two-factor authentication"
            description="Authenticator app codes on every sign-in. Disable requires password."
            icon={Smartphone}
            action={
              <Switch
                checked={twoFa}
                onCheckedChange={(v) => {
                  toast.info(
                    '2FA uses the production auth flow',
                    'Authenticator enrolment is not available from this panel yet.',
                  )
                  setTwoFa(v)
                }}
                aria-label="Toggle two-factor authentication"
              />
            }
          >
            <div className="rounded-xl border border-line/80 bg-inset/40 px-3.5 py-3">
              <p className="text-body-sm font-medium text-fg">Authenticator app</p>
              <p className="mt-0.5 text-caption text-fg-subtle">
                {twoFa
                  ? 'UI preview only — enable 2FA via production auth when available'
                  : 'Recommended for withdrawal protection'}
              </p>
            </div>
            {!twoFa ? (
              <div className="mt-3.5 rounded-xl border border-dashed border-line/80 px-3 py-6 text-center">
                <p className="text-body-sm text-fg">Enable 2FA to generate QR / backup codes</p>
              </div>
            ) : null}
          </SettingsCard>
        </TabsContent>
      </Tabs>

      <AddBankAccountDialog
        open={bankOpen}
        onOpenChange={(open) => {
          setBankOpen(open)
          if (!open) setEditingBank(null)
        }}
        method={editingBank}
        defaultAsPrimary={bankAccounts.length === 0}
      />
      <AddCryptoWalletDialog
        open={walletOpen}
        onOpenChange={(open) => {
          setWalletOpen(open)
          if (!open) setEditingWallet(null)
        }}
        method={editingWallet}
        defaultAsPrimary={cryptoWallets.length === 0}
      />
    </div>
  )
}
