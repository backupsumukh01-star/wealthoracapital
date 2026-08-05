'use client'

import { useState } from 'react'
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

export type AdminSettingsSection =
  | 'general'
  | 'platform'
  | 'email'
  | 'security'
  | 'roles'
  | 'paymentMethods'
  | 'staff'

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="flex justify-end border-t border-white/[0.06] px-4 py-4 sm:px-5">
      <Button type="button" onClick={onSave}>
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
  const [name, setName] = useState('Growzy')
  const [support, setSupport] = useState('support@growzy.com')
  const [timezone, setTimezone] = useState('Asia/Dubai')

  return (
    <AdminPanel>
      <AdminPanelHeader title="General" description="Brand and support defaults." />
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <FormField label="Platform name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Support email">
          <Input type="email" value={support} onChange={(e) => setSupport(e.target.value)} />
        </FormField>
        <FormField label="Default timezone" className="sm:col-span-2">
          <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </FormField>
      </div>
      <SaveBar onSave={() => toast.success('General settings saved')} />
    </AdminPanel>
  )
}

function PlatformSection() {
  const [minDeposit, setMinDeposit] = useState('100')
  const [maxDeposit, setMaxDeposit] = useState('100000')
  const [minWithdraw, setMinWithdraw] = useState('50')
  const [dailyCap, setDailyCap] = useState('25000')
  const [cutoff, setCutoff] = useState('21:00')
  const [maintenance, setMaintenance] = useState(false)
  const [maintenanceMsg, setMaintenanceMsg] = useState('')

  return (
    <div className="space-y-5">
      <Alert tone="info" title="Limits apply from the moment they are saved">
        Changing a limit does not alter requests already submitted.
      </Alert>
      <AdminPanel>
        <AdminPanelHeader title="Deposit limits" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <FormField label="Minimum (USD)">
            <Input value={minDeposit} onChange={(e) => setMinDeposit(e.target.value)} />
          </FormField>
          <FormField label="Maximum (USD)">
            <Input value={maxDeposit} onChange={(e) => setMaxDeposit(e.target.value)} />
          </FormField>
        </div>
      </AdminPanel>
      <AdminPanel>
        <AdminPanelHeader title="Withdrawal limits" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <FormField label="Minimum (USD)">
            <Input value={minWithdraw} onChange={(e) => setMinWithdraw(e.target.value)} />
          </FormField>
          <FormField label="Daily cap (USD)">
            <Input value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} />
          </FormField>
        </div>
      </AdminPanel>
      <AdminPanel>
        <AdminPanelHeader title="Trading calendar" description="Settlement cut-off (desk local)." />
        <div className="p-4 sm:p-5">
          <FormField label="Daily return cut-off">
            <Input type="time" value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
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
            >
              <Toggle checked={maintenance} label="Maintenance mode" />
            </button>
          </label>
          <FormField label="Public message">
            <Textarea
              rows={2}
              value={maintenanceMsg}
              onChange={(e) => setMaintenanceMsg(e.target.value)}
              placeholder="Shown to investors while maintenance is on."
            />
          </FormField>
        </div>
        <SaveBar onSave={() => toast.success('Platform settings saved')} />
      </AdminPanel>
    </div>
  )
}

function EmailSection() {
  const [fromName, setFromName] = useState('Growzy')
  const [fromEmail, setFromEmail] = useState('noreply@growzy.com')
  const [replyTo, setReplyTo] = useState('support@growzy.com')

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Email defaults"
        description="Sender identity for transactional templates."
      />
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <FormField label="From name">
          <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
        </FormField>
        <FormField label="From address">
          <Input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
        </FormField>
        <FormField label="Reply-to" className="sm:col-span-2">
          <Input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} />
        </FormField>
      </div>
      <SaveBar onSave={() => toast.success('Email settings saved')} />
    </AdminPanel>
  )
}

function SecuritySection() {
  const [sessionHours, setSessionHours] = useState('8')
  const [require2fa, setRequire2fa] = useState(true)
  const [ipAllowlist, setIpAllowlist] = useState('')

  return (
    <AdminPanel>
      <AdminPanelHeader title="Security" description="Operator console hardening." />
      <div className="space-y-4 p-4 sm:p-5">
        <FormField label="Session length (hours)">
          <Input value={sessionHours} onChange={(e) => setSessionHours(e.target.value)} />
        </FormField>
        <label className="flex items-center justify-between gap-3 text-body-sm text-fg">
          Require 2FA for all staff
          <button type="button" onClick={() => setRequire2fa((v) => !v)} className="shrink-0">
            <Toggle checked={require2fa} label="Require 2FA" />
          </button>
        </label>
        <FormField label="IP allowlist" hint="Comma-separated. Empty = allow all.">
          <Textarea
            rows={3}
            value={ipAllowlist}
            onChange={(e) => setIpAllowlist(e.target.value)}
            placeholder="203.0.113.10, 198.51.100.0/24"
          />
        </FormField>
      </div>
      <SaveBar onSave={() => toast.success('Security settings saved')} />
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
  const [methods, setMethods] = useState([
    { id: 'bank', name: 'Bank transfer', details: 'Growzy Ops · IBAN AE00…', enabled: true },
    { id: 'usdt', name: 'USDT (TRC20)', details: 'Configure address in Payments', enabled: true },
  ])

  return (
    <div className="space-y-5">
      <Alert tone="danger" title="These details are what investors send money to">
        A typo here sends real funds to the wrong place. Changes require super admin in production.
      </Alert>
      <AdminPanel>
        <AdminPanelHeader title="Accepted methods" />
        <ul className="divide-y divide-white/[0.04]">
          {methods.map((m, idx) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <div>
                <p className="text-body-sm font-medium text-fg">{m.name}</p>
                <p className="text-caption text-fg-muted">{m.details}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setMethods((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, enabled: !x.enabled } : x)),
                  )
                }
              >
                <Toggle checked={m.enabled} label={`${m.name} enabled`} />
              </button>
            </li>
          ))}
        </ul>
        <SaveBar onSave={() => toast.success('Payment methods saved')} />
      </AdminPanel>
    </div>
  )
}

function StaffSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'users', 'staff'],
    queryFn: () => adminService.users(),
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
