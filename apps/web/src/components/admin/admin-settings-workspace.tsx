'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ROUTES } from '@meridian/shared'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/cn'
import { adminService } from '@/services/admin.service'
import { settingsService } from '@/services/settings.service'

export type AdminSettingsSection =
  | 'general'
  | 'platform'
  | 'email'
  | 'security'
  | 'roles'
  | 'paymentMethods'
  | 'staff'

function SaveBar({ onSave, disabled }: { onSave: () => void; disabled?: boolean }) {
  return (
    <div className="flex justify-end border-t border-white/[0.06] px-4 py-4 sm:px-5">
      <Button type="button" onClick={onSave} disabled={disabled}>
        Save changes
      </Button>
    </div>
  )
}

function Toggle({
  checked,
  disabled,
  label,
}: {
  checked: boolean
  disabled?: boolean
  label: string
}) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors',
        checked ? 'border-accent-500/50 bg-accent-500/40' : 'border-white/15 bg-white/10',
        disabled && 'opacity-60',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-4 rounded-full bg-fg transition-transform',
          checked ? 'left-4' : 'left-0.5',
        )}
      />
    </span>
  )
}

function GeneralSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'platform'],
    queryFn: () => settingsService.adminGet(),
  })
  const [name, setName] = useState('')
  const [support, setSupport] = useState('')
  const [timezone, setTimezone] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!data || hydrated) return
    setName(data.companyName)
    setSupport(data.supportEmail)
    setTimezone(data.timezone)
    setHydrated(true)
  }, [data, hydrated])

  async function save() {
    setSaving(true)
    try {
      await settingsService.adminUpdate({
        companyName: name.trim(),
        supportEmail: support.trim(),
        timezone: timezone.trim(),
      })
      toast.success('General settings saved')
    } catch {
      toast.error('Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPanel>
      <AdminPanelHeader title="General" description="Brand and support defaults." />
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <FormField label="Platform name">
          <Input
            value={name}
            disabled={isLoading || !hydrated}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField label="Support email">
          <Input
            type="email"
            value={support}
            disabled={isLoading || !hydrated}
            onChange={(e) => setSupport(e.target.value)}
          />
        </FormField>
        <FormField label="Default timezone" className="sm:col-span-2">
          <Input
            value={timezone}
            disabled={isLoading || !hydrated}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </FormField>
      </div>
      <SaveBar onSave={() => void save()} disabled={saving || isLoading} />
    </AdminPanel>
  )
}

function PlatformSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'platform'],
    queryFn: () => settingsService.adminGet(),
  })
  const [minDeposit, setMinDeposit] = useState('')
  const [maxDeposit, setMaxDeposit] = useState('')
  const [minWithdraw, setMinWithdraw] = useState('')
  const [maxWithdraw, setMaxWithdraw] = useState('')
  const [usdInrRate, setUsdInrRate] = useState('')
  const [maintenance, setMaintenance] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!data || hydrated) return
    setMinDeposit(data.limits.minDeposit)
    setMaxDeposit(data.limits.maxDeposit)
    setMinWithdraw(data.limits.minWithdrawal)
    setMaxWithdraw(data.limits.maxWithdrawal)
    setUsdInrRate(data.usdInrRate ?? '93')
    setMaintenance(data.maintenanceMode)
    setHydrated(true)
  }, [data, hydrated])

  async function save() {
    setSaving(true)
    try {
      await settingsService.adminUpdate({
        minDeposit: minDeposit.trim(),
        maxDeposit: maxDeposit.trim(),
        minWithdrawal: minWithdraw.trim(),
        maxWithdrawal: maxWithdraw.trim(),
        usdInrRate: usdInrRate.trim(),
        maintenanceMode: maintenance,
      })
      toast.success('Platform settings saved')
    } catch {
      toast.error('Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <Alert tone="info" title="Limits apply from the moment they are saved">
        Changing a limit does not alter requests already submitted. Exchange-rate changes apply to
        new deposits and withdrawals only — existing snapshots stay as recorded.
      </Alert>
      <AdminPanel>
        <AdminPanelHeader
          title="USD ↔ INR desk rate"
          description="Live conversion rate used on deposit/withdraw forms and INR equivalents."
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <FormField
            label="1 USD = ? INR"
            hint="Whole-rupee display on investor forms. Ledger remains USD."
          >
            <Input
              inputMode="decimal"
              value={usdInrRate}
              disabled={isLoading || !hydrated}
              onChange={(e) => setUsdInrRate(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="93"
            />
          </FormField>
        </div>
      </AdminPanel>
      <AdminPanel>
        <AdminPanelHeader title="Deposit limits" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <FormField label="Minimum (USD)">
            <Input
              value={minDeposit}
              disabled={isLoading || !hydrated}
              onChange={(e) => setMinDeposit(e.target.value)}
            />
          </FormField>
          <FormField label="Maximum (USD)">
            <Input
              value={maxDeposit}
              disabled={isLoading || !hydrated}
              onChange={(e) => setMaxDeposit(e.target.value)}
            />
          </FormField>
        </div>
      </AdminPanel>
      <AdminPanel>
        <AdminPanelHeader title="Withdrawal limits" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <FormField label="Minimum (USD)">
            <Input
              value={minWithdraw}
              disabled={isLoading || !hydrated}
              onChange={(e) => setMinWithdraw(e.target.value)}
            />
          </FormField>
          <FormField label="Maximum (USD)">
            <Input
              value={maxWithdraw}
              disabled={isLoading || !hydrated}
              onChange={(e) => setMaxWithdraw(e.target.value)}
            />
          </FormField>
        </div>
      </AdminPanel>
      <AdminPanel>
        <AdminPanelHeader title="Maintenance mode" />
        <div className="space-y-4 p-4 sm:p-5">
          <label className="flex items-center justify-between gap-3 text-body-sm text-fg">
            Block deposits &amp; withdrawals
            <button
              type="button"
              onClick={() => setMaintenance((v) => !v)}
              className="shrink-0"
              disabled={isLoading || !hydrated}
            >
              <Toggle checked={maintenance} label="Maintenance mode" />
            </button>
          </label>
        </div>
        <SaveBar onSave={() => void save()} disabled={saving || isLoading} />
      </AdminPanel>
    </div>
  )
}

function EmailSection() {
  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Email defaults"
        description="Sender identity is configured via server environment (EMAIL_TRANSPORT / SMTP_FROM_* / Resend)."
      />
      <div className="space-y-3 p-4 sm:p-5">
        <Alert tone="info" title="Managed in deployment env">
          Changing From name/address in the UI is disabled — production mail must use verified Resend (or
          ESP) credentials so OTP and finance emails never silently drop.
        </Alert>
        <Button asChild variant="secondary">
          <Link href={ROUTES.admin.emailTemplates}>Open email templates</Link>
        </Button>
      </div>
    </AdminPanel>
  )
}

function SecuritySection() {
  return (
    <AdminPanel>
      <AdminPanelHeader title="Security" description="Operator console hardening." />
      <div className="space-y-3 p-4 sm:p-5">
        <Alert tone="info" title="Managed via environment & auth service">
          Session TTL, CSRF, rate limits, and JWT secrets are deployment configuration — not stored in
          this form — so operators cannot weaken production auth from the UI.
        </Alert>
        <Button asChild variant="secondary">
          <Link href={ROUTES.admin.settings.roles}>Review role permissions</Link>
        </Button>
      </div>
    </AdminPanel>
  )
}

function RolesSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => adminService.roles(),
  })

  const items = data?.items ?? []
  const matrix = data?.matrix
  const permissions = matrix?.permissions ?? []
  const roles = matrix?.roles ?? items.map((r) => ({ roleKey: r.roleKey, label: r.label }))

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Roles & permission matrix"
        description="Read-only production RBAC from the API. Role changes revoke all sessions for that user."
      />
      {isLoading ? (
        <p className="px-5 py-8 text-caption text-fg-subtle">Loading matrix…</p>
      ) : isError ? (
        <p className="px-5 py-8 text-caption text-danger">Could not load roles from API.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="sticky left-0 bg-[#0b1620] px-4 py-3 font-medium sm:px-5">
                  Permission
                </th>
                {roles.map((r) => (
                  <th key={r.roleKey} className="px-2 py-3 font-medium whitespace-nowrap">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm) => (
                <tr key={perm} className="border-b border-white/[0.04] last:border-0">
                  <td className="sticky left-0 bg-[#0b1620] px-4 py-3 text-fg sm:px-5">
                    <code className="text-[11px]">{perm}</code>
                  </td>
                  {roles.map((r) => {
                    const on = Boolean(matrix?.matrix[perm]?.[r.roleKey])
                    return (
                      <td key={r.roleKey} className="px-2 py-3 text-center">
                        <span className={on ? 'text-profit' : 'text-fg-subtle'}>
                          {on ? '●' : '○'}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
        <p className="text-caption text-fg-subtle">
          Matrix is enforced by the API. Changing a user&apos;s role or staffRole immediately
          invalidates their JWT sessions.
        </p>
      </div>
    </AdminPanel>
  )
}

function PaymentMethodsSection() {
  return (
    <div className="space-y-5">
      <Alert tone="danger" title="These details are what investors send money to">
        Manage deposit rails on the live Payment Methods screen — this settings stub never persisted.
      </Alert>
      <AdminPanel>
        <AdminPanelHeader
          title="Accepted methods"
          description="Bank, UPI, and crypto rails are edited in the dedicated payments workspace."
          action={
            <Button asChild size="sm">
              <Link href={ROUTES.admin.settings.paymentMethods}>Open payment methods</Link>
            </Button>
          }
        />
        <div className="p-4 text-caption text-fg-muted sm:p-5">
          Addresses, QR codes, networks, and fees are loaded from the database there.
        </div>
      </AdminPanel>
    </div>
  )
}

function StaffSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'users', 'staff'],
    queryFn: () => adminService.users({ limit: 100, page: 1 }),
  })

  const staff = (data?.items ?? []).filter(
    (u) =>
      u.role === 'ADMIN' ||
      u.role === 'SUPER_ADMIN' ||
      u.staffRole !== null,
  )

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Staff"
        description="Operators with console access. Change roles on the user detail Security tab — that revokes their JWTs."
        action={
          <Button type="button" size="sm" variant="secondary" asChild>
            <Link href={ROUTES.admin.users}>Open users</Link>
          </Button>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-caption">
          <thead className="border-b border-white/[0.06] text-fg-subtle">
            <tr>
              <th className="px-4 py-3 font-medium sm:px-5">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Staff</th>
              <th className="px-4 py-3 font-medium sm:px-5">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-fg-subtle sm:px-5">
                  Loading…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-danger sm:px-5">
                  Could not load staff from API.
                </td>
              </tr>
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-fg-subtle sm:px-5">
                  No operators yet.
                </td>
              </tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-3 font-medium text-fg sm:px-5">
                    <Link className="hover:text-accent-300" href={ROUTES.admin.user(s.id)}>
                      {s.firstName} {s.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{s.email}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fg">{s.role}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fg">{s.staffRole ?? '—'}</td>
                  <td className="px-4 py-3 text-fg-muted sm:px-5">{s.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminPanel>
  )
}

export function AdminSettingsWorkspace({ section }: { section: AdminSettingsSection }) {
  switch (section) {
    case 'general':
      return <GeneralSection />
    case 'platform':
      return <PlatformSection />
    case 'email':
      return <EmailSection />
    case 'security':
      return <SecuritySection />
    case 'roles':
      return <RolesSection />
    case 'paymentMethods':
      return <PaymentMethodsSection />
    case 'staff':
      return <StaffSection />
    default:
      return null
  }
}
