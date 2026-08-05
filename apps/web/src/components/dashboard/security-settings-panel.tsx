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
import { useChangePassword } from '@/features/auth/hooks'
import { ApiError } from '@/lib/api-client'
import { useSession } from '@/providers/session-provider'

export function SecuritySettingsPanel() {
  const { session } = useSession()
  const changePassword = useChangePassword()
  const [busy, setBusy] = useState(false)

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <SettingsCard
        title="Password"
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
            setBusy(true)
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
                      : 'Update failed',
                )
              })
              .finally(() => setBusy(false))
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
          <Button type="submit" loading={busy}>
            Update password
          </Button>
        </form>
      </SettingsCard>

      <SettingsCard
        title="Active sessions"
        description="Devices currently signed in — IP, country, browser."
        icon={MonitorSmartphone}
      >
        <ul className="space-y-2">
          <SettingsRow
            label="This device"
            value={session ? 'Active now' : 'Signed out'}
            hint="Session revoke for other devices will use the production auth flow."
          />
        </ul>
        <Button
          className="mt-3.5"
          variant="secondary"
          onClick={() =>
            toast.info(
              'Session revoke is not available here yet',
              'Use production auth session management when enabled.',
            )
          }
        >
          Sign out other devices
        </Button>
      </SettingsCard>

      <SettingsCard
        title="Two-factor authentication"
        description="Manage authenticator enrolment from Profile · 2FA."
        icon={ShieldCheck}
      >
        <SettingsRow label="Status" value="Managed in production auth" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href={ROUTES.dashboard.settings.profile}>Open Profile · 2FA</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              toast.info(
                '2FA enrolment uses the production auth flow',
                'Authenticator setup is not available from this demo panel.',
              )
            }
          >
            Manage 2FA
          </Button>
        </div>
      </SettingsCard>
    </div>
  )
}
