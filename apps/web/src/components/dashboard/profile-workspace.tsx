'use client'

import { useState } from 'react'
import {
  BadgeCheck,
  KeyRound,
  Landmark,
  ShieldCheck,
  Smartphone,
  UserRound,
  Wallet,
} from 'lucide-react'

import { PageHeader } from '@/components/common/page-header'
import { SettingsCard, SettingsRow } from '@/components/dashboard/settings-card'
import { StatusPill } from '@/components/dashboard/status-pill'
import { PremiumEmptyState } from '@/components/dashboard/premium-empty-state'
import { LifecycleStatusBadge, KycStatusBadge } from '@/components/auth/lifecycle-status-badge'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import { DEMO_PROFILE, DEMO_SESSION } from '@/lib/dashboard-data'
import { SAVED_CRYPTO_WALLETS, SAVED_INR_ACCOUNTS } from '@/lib/investor-demo-data'
import { displayUsername } from '@/lib/investor-lifecycle'
import { formatDateTime } from '@/lib/format'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'
import { cn } from '@/lib/cn'

const TABS = [
  { id: 'personal', label: 'Personal', icon: UserRound },
  { id: 'bank', label: 'Bank', icon: Landmark },
  { id: 'crypto', label: 'Crypto', icon: Wallet },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'kyc', label: 'KYC', icon: BadgeCheck },
  { id: 'password', label: 'Password', icon: KeyRound },
  { id: '2fa', label: '2FA', icon: Smartphone },
] as const

export function ProfileWorkspace({ showHeader = true }: { showHeader?: boolean }) {
  const { session, changePassword, toggle2fa, logoutAllDevices, queueEmail } =
    useInvestorLifecycle()
  const [twoFa, setTwoFa] = useState(session?.twoFactorEnabled ?? false)
  const user = session
    ? {
        firstName: session.firstName,
        lastName: session.lastName,
        email: session.email,
        phone: session.phone,
        country: session.kyc?.country ?? '',
        timezone: 'Asia/Karachi',
        userId: session.userId,
        username: session.username,
        status: session.status,
        kycStatus: session.kycStatus,
        createdAt: session.createdAt,
        investorSince: session.investorSince,
      }
    : {
        firstName: DEMO_SESSION.user.firstName,
        lastName: DEMO_SESSION.user.lastName,
        email: DEMO_SESSION.user.email,
        phone: DEMO_SESSION.user.phone ?? '',
        country: DEMO_SESSION.user.country ?? '',
        timezone: DEMO_SESSION.user.timezone ?? '',
        userId: 'GRZ-100001',
        username: 'ayesha',
        status: 'VERIFIED' as const,
        kycStatus: 'APPROVED' as const,
        createdAt: DEMO_PROFILE.memberSince,
        investorSince: DEMO_PROFILE.memberSince,
      }

  return (
    <div className="min-w-0 max-w-full space-y-4 sm:space-y-5 lg:space-y-6">
      {showHeader ? (
        <PageHeader
          className="pb-2 sm:pb-4"
          title="Profile"
          description="Personal details, payout destinations, KYC, and account security."
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

        <TabsContent value="personal" className="mt-4">
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
                toast.success('Profile saved (demo)')
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
            description="Saved INR payout accounts."
            icon={Landmark}
          >
            {SAVED_INR_ACCOUNTS.length === 0 ? (
              <PremiumEmptyState
                variant="wallet"
                title="No bank accounts"
                description="Add an INR account to receive withdrawals."
                action={
                  <Button variant="secondary" onClick={() => toast.info('Add bank account is a UI preview.')}>
                    Add bank account
                  </Button>
                }
              />
            ) : (
              <>
                <ul className="space-y-2.5">
                  {SAVED_INR_ACCOUNTS.map((b) => (
                    <li
                      key={b.id}
                      className={cn(
                        'rounded-xl border px-3.5 py-3',
                        b.primary
                          ? 'border-accent-700/40 bg-accent-500/8'
                          : 'border-line/80 bg-inset/30',
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-body-sm font-medium text-fg">
                          {b.bankName}
                          {b.primary ? (
                            <span className="ml-2 text-caption text-accent-300">Primary</span>
                          ) : null}
                        </p>
                        <StatusPill status="APPROVED" />
                      </div>
                      <p className="mt-1 text-caption text-fg-muted">
                        {b.accountName} · {b.accountNumberMasked} · {b.ifsc}
                      </p>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-3.5"
                  variant="secondary"
                  onClick={() => toast.info('Add bank account is a UI preview.')}
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
            {SAVED_CRYPTO_WALLETS.length === 0 ? (
              <PremiumEmptyState
                variant="wallet"
                title="No wallets yet"
                description="Save a crypto address for faster withdrawals."
              />
            ) : (
              <>
                <ul className="space-y-2.5">
                  {SAVED_CRYPTO_WALLETS.map((w) => (
                    <li
                      key={w.id}
                      className="rounded-xl border border-line/80 bg-inset/30 px-3.5 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-body-sm font-medium text-fg">
                          {w.label}
                          {w.primary ? (
                            <span className="ml-2 text-caption text-accent-300">Primary</span>
                          ) : null}
                        </p>
                        <span className="text-caption text-fg-subtle">
                          {w.coin} · {w.network}
                        </span>
                      </div>
                      <div className="mt-2 flex items-start gap-2">
                        <p className="min-w-0 flex-1 break-all font-mono text-caption text-fg-muted">
                          {w.address}
                        </p>
                        <CopyButton value={w.address} label="Wallet address" />
                      </div>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-3.5"
                  variant="secondary"
                  onClick={() => toast.info('Add wallet is a UI preview.')}
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
              <SettingsRow label="Email verified" value={<span className="text-profit">Yes</span>} />
              <SettingsRow label="Two-factor authentication" value={twoFa ? 'Enabled' : 'Off'} />
              <SettingsRow label="Active sessions" value="1 (this device)" />
            </div>
            <Button
              className="mt-3.5"
              variant="secondary"
              onClick={() => {
                logoutAllDevices()
                toast.success('Other sessions signed out')
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
            description="Requires current password and email OTP (demo: 123456)."
            icon={KeyRound}
          >
            <form
              className="max-w-md space-y-3.5"
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const current = String(fd.get('current') ?? '')
                const next = String(fd.get('next') ?? '')
                const confirm = String(fd.get('confirm') ?? '')
                const otp = String(fd.get('otp') ?? '')
                const logoutOthers = fd.get('logoutOthers') === 'on'
                if (next !== confirm) {
                  toast.error('Passwords do not match')
                  return
                }
                const result = changePassword(current, next, otp, logoutOthers)
                if (!result.ok) {
                  toast.error(result.error ?? 'Could not update password')
                  return
                }
                toast.success('Password updated')
                e.currentTarget.reset()
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
              <FormField label="Email OTP" required hint="Demo code 123456">
                <Input name="otp" inputMode="numeric" maxLength={6} placeholder="123456" />
              </FormField>
              <label className="flex items-center gap-2 text-caption text-fg-muted">
                <input type="checkbox" name="logoutOthers" className="size-4 rounded border-line" />
                Logout all other devices
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (session) queueEmail('VERIFY_EMAIL', session.email)
                  toast.success('OTP sent', 'Code: 123456')
                }}
              >
                Send email OTP
              </Button>
              <Button type="submit">Update password</Button>
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
                  if (!v) {
                    const password = window.prompt('Enter password to disable 2FA') ?? ''
                    const result = toggle2fa(false, password)
                    if (!result.ok) {
                      toast.error(result.error ?? 'Could not disable 2FA')
                      return
                    }
                    setTwoFa(false)
                    toast.success('2FA disabled')
                    return
                  }
                  const result = toggle2fa(true)
                  if (!result.ok) {
                    toast.error(result.error ?? 'Could not enable 2FA')
                    return
                  }
                  setTwoFa(true)
                  toast.success('2FA enabled')
                }}
                aria-label="Toggle two-factor authentication"
              />
            }
          >
            <div className="rounded-xl border border-line/80 bg-inset/40 px-3.5 py-3">
              <p className="text-body-sm font-medium text-fg">Authenticator app</p>
              <p className="mt-0.5 text-caption text-fg-subtle">
                {twoFa ? 'Enabled — login requires authenticator code (demo OTP 123456)' : 'Recommended for withdrawal protection'}
              </p>
            </div>
            {twoFa && session?.backupCodes?.length ? (
              <div className="mt-3.5 space-y-2">
                <p className="text-caption text-fg-muted">Backup codes</p>
                <ul className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-fg">
                  {session.backupCodes.map((c) => (
                    <li key={c} className="rounded-md bg-inset px-2 py-1">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ) : !twoFa ? (
              <div className="mt-3.5 rounded-xl border border-dashed border-line/80 px-3 py-6 text-center">
                <p className="text-body-sm text-fg">Enable 2FA to generate QR / backup codes</p>
                <p className="mt-1 text-caption text-fg-subtle">
                  Demo secret: GROWZY-DEMO-2FA · OTP accepts 123456
                </p>
              </div>
            ) : null}
          </SettingsCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
