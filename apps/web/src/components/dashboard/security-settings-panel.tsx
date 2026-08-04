'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { KeyRound, MonitorSmartphone, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { SettingsCard, SettingsRow } from '@/components/dashboard/settings-card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { formatDateTime } from '@/lib/format'
import { DEMO_OTP } from '@/lib/investor-lifecycle'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

export function SecuritySettingsPanel() {
  const { session, changePassword, logoutAllDevices, queueEmail, toggle2fa } = useInvestorLifecycle()
  const [otpSent, setOtpSent] = useState(false)

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <SettingsCard
        title="Password"
        description="Requires current password and email OTP. Optionally logout all devices."
        icon={KeyRound}
      >
        <form
          className="max-w-md space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const result = changePassword(
              String(fd.get('current') ?? ''),
              String(fd.get('next') ?? ''),
              String(fd.get('otp') ?? ''),
              fd.get('logoutOthers') === 'on',
            )
            if (!result.ok) {
              toast.error(result.error ?? 'Update failed')
              return
            }
            toast.success('Password updated')
            e.currentTarget.reset()
            setOtpSent(false)
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
          <FormField label="Email OTP" required hint={otpSent ? `Demo: ${DEMO_OTP}` : 'Send OTP first'}>
            <Input name="otp" inputMode="numeric" maxLength={6} />
          </FormField>
          <label className="flex items-center gap-2 text-caption text-fg-muted">
            <input type="checkbox" name="logoutOthers" className="size-4 rounded border-line" />
            Logout all other devices
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (session) queueEmail('PASSWORD_RESET', session.email)
                setOtpSent(true)
                toast.success(`OTP sent · ${DEMO_OTP}`)
              }}
            >
              Send OTP
            </Button>
            <Button type="submit">Update password</Button>
          </div>
        </form>
      </SettingsCard>

      <SettingsCard
        title="Active sessions"
        description="Devices currently signed in — IP, country, browser."
        icon={MonitorSmartphone}
      >
        <ul className="space-y-2">
          {(session?.loginHistory ?? []).length === 0 ? (
            <SettingsRow label="This device" value="Active now" hint="Chrome / Windows" />
          ) : (
            session!.loginHistory.map((l) => (
              <SettingsRow
                key={l.id}
                label={l.current ? 'Current session' : formatDateTime(l.at)}
                value={l.browser}
                hint={`${l.ip} · ${l.country}`}
              />
            ))
          )}
        </ul>
        <Button
          className="mt-3.5"
          variant="secondary"
          onClick={() => {
            logoutAllDevices()
            toast.success('Other sessions revoked')
          }}
        >
          Sign out other devices
        </Button>
      </SettingsCard>

      <SettingsCard
        title="Two-factor authentication"
        description="Manage authenticator enrolment from Profile · 2FA."
        icon={ShieldCheck}
      >
        <SettingsRow
          label="Status"
          value={session?.twoFactorEnabled ? 'Enabled' : 'Off'}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href={ROUTES.dashboard.settings.profile}>Open Profile · 2FA</Link>
          </Button>
          {session?.twoFactorEnabled ? (
            <Button
              variant="ghost"
              onClick={() => {
                const password = window.prompt('Password to disable 2FA') ?? ''
                const result = toggle2fa(false, password)
                if (!result.ok) toast.error(result.error ?? 'Failed')
                else toast.success('2FA disabled')
              }}
            >
              Disable 2FA
            </Button>
          ) : null}
        </div>
      </SettingsCard>
    </div>
  )
}
