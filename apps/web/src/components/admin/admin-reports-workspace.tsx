'use client'

import { useMemo, useState } from 'react'
import { FileSpreadsheet, FileText, Table2 } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { useAdminOpsDashboard } from '@/features/admin/hooks'
import { adminService } from '@/services/admin.service'
import { cn } from '@/lib/cn'

const REPORT_TYPES = [
  { id: 'INVESTOR', label: 'Users', description: 'Registrations, status, KYC' },
  { id: 'FINANCE', label: 'Finance', description: 'Deposits and withdrawals' },
  { id: 'KYC', label: 'KYC', description: 'Verification queue outcomes' },
  { id: 'DAILY', label: 'Daily returns', description: 'Settlement runs and distribution' },
  { id: 'PERFORMANCE', label: 'Performance', description: 'Trades and investor P/L' },
  { id: 'PORTFOLIO', label: 'Portfolio', description: 'Allocations and balances' },
  { id: 'AUDIT', label: 'Admin activity', description: 'Operator audit trail' },
] as const

type ReportId = (typeof REPORT_TYPES)[number]['id']

type Preset =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function rangeForPreset(preset: Preset): { from: string; to: string } {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const tomorrow = new Date(today)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  switch (preset) {
    case 'today':
      return { from: isoDate(today), to: isoDate(tomorrow) }
    case 'yesterday': {
      const y = new Date(today)
      y.setUTCDate(y.getUTCDate() - 1)
      return { from: isoDate(y), to: isoDate(today) }
    }
    case 'last7': {
      const from = new Date(today)
      from.setUTCDate(from.getUTCDate() - 6)
      return { from: isoDate(from), to: isoDate(tomorrow) }
    }
    case 'last30': {
      const from = new Date(today)
      from.setUTCDate(from.getUTCDate() - 29)
      return { from: isoDate(from), to: isoDate(tomorrow) }
    }
    case 'thisMonth': {
      const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
      return { from: isoDate(from), to: isoDate(tomorrow) }
    }
    case 'lastMonth': {
      const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
      const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
      return { from: isoDate(from), to: isoDate(to) }
    }
    default:
      return { from: isoDate(today), to: isoDate(tomorrow) }
  }
}

const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 Days' },
  { id: 'last30', label: 'Last 30 Days' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'custom', label: 'Custom Date' },
]

export function AdminReportsWorkspace() {
  const { data: ops } = useAdminOpsDashboard()
  const [selected, setSelected] = useState<ReportId>('FINANCE')
  const [preset, setPreset] = useState<Preset>('last30')
  const initial = rangeForPreset('last30')
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [user, setUser] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [status, setStatus] = useState('')
  const [coin, setCoin] = useState('')
  const [network, setNetwork] = useState('')
  const [amount, setAmount] = useState('')
  const [admin, setAdmin] = useState('')
  const [exporting, setExporting] = useState(false)

  function applyPreset(next: Preset) {
    setPreset(next)
    if (next === 'custom') return
    const range = rangeForPreset(next)
    setFrom(range.from)
    setTo(range.to)
  }

  const filters = useMemo(() => {
    const f: Record<string, string> = {}
    if (user.trim()) f.user = user.trim()
    if (email.trim()) f.email = email.trim()
    if (phone.trim()) f.phone = phone.trim()
    if (country.trim()) f.country = country.trim()
    if (status.trim()) f.status = status.trim()
    if (coin.trim()) f.coin = coin.trim()
    if (network.trim()) f.network = network.trim()
    if (amount.trim()) f.amount = amount.trim()
    if (admin.trim()) f.admin = admin.trim()
    return f
  }, [user, email, phone, country, status, coin, network, amount, admin])

  async function download(format: 'CSV' | 'Excel' | 'PDF') {
    const report = REPORT_TYPES.find((r) => r.id === selected)!
    const apiFormat = format === 'Excel' ? 'XLSX' : format
    setExporting(true)
    try {
      const result = await adminService.generateReport({
        type: report.id,
        from,
        to,
        format: apiFormat,
        filters: Object.keys(filters).length ? filters : undefined,
      })
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank')
        toast.success(`${format} export ready`, { description: report.label })
      } else {
        toast.success('Export queued', {
          description: `${report.label} · ${result.reference ?? result.jobId}`,
        })
      }
    } catch {
      toast.error('Could not start export. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const totals = ops?.totals

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Financial Reports"
        description="Filter live ledger data and export CSV, Excel, or PDF for the active filters only."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={exporting}
              onClick={() => void download('CSV')}
            >
              <FileSpreadsheet aria-hidden />
              CSV
            </Button>
            <Button
              type="button"
              variant="glass"
              disabled={exporting}
              onClick={() => void download('Excel')}
            >
              <Table2 aria-hidden />
              Excel
            </Button>
            <Button type="button" disabled={exporting} onClick={() => void download('PDF')}>
              <FileText aria-hidden />
              PDF
            </Button>
          </div>
        }
      />

      {totals ? (
        <AdminPanel glow>
          <AdminPanelHeader title="Filtered summary (live)" description="Platform totals from the operations snapshot" />
          <div className="grid gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4 sm:p-5">
            {[
              { label: 'Total deposits', value: String(totals.deposits.total) },
              { label: 'Approved deposits', value: String(totals.deposits.approved) },
              { label: 'Rejected deposits', value: String(totals.deposits.rejected) },
              { label: 'Pending deposits', value: String(totals.deposits.pending) },
              { label: 'Total withdrawals', value: String(totals.withdrawals.total) },
              { label: 'Approved withdrawals', value: String(totals.withdrawals.approved) },
              { label: 'Rejected withdrawals', value: String(totals.withdrawals.rejected) },
              { label: 'Pending withdrawals', value: String(totals.withdrawals.pending) },
              { label: 'Total KYC', value: String(totals.kyc.total) },
              { label: 'Approved KYC', value: String(totals.kyc.approved) },
              { label: 'Rejected KYC', value: String(totals.kyc.rejected) },
              { label: 'Pending KYC', value: String(totals.kyc.pending) },
              { label: 'Total users', value: String(totals.users.total) },
              { label: 'Verified users', value: String(totals.users.verified) },
              { label: 'Active users', value: String(totals.users.active) },
              { label: 'Suspended users', value: String(totals.users.suspended) },
              { label: 'Deleted users', value: String(totals.users.deleted) },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <p className="text-[10px] text-fg-subtle">{row.label}</p>
                <p className="text-body-sm font-semibold tabular-nums text-fg">{row.value}</p>
              </div>
            ))}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 sm:col-span-2">
              <p className="text-[10px] text-fg-subtle">Daily / monthly / lifetime profit</p>
              <p className="mt-1 text-body-sm font-semibold tabular-nums text-fg">
                <Money value={totals.profit.daily} /> · <Money value={totals.profit.monthly} /> ·{' '}
                <Money value={totals.profit.lifetime} />
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 sm:col-span-2">
              <p className="text-[10px] text-fg-subtle">Deposit / withdrawal volume</p>
              <p className="mt-1 text-body-sm font-semibold tabular-nums text-fg">
                <Money value={totals.deposits.amount} /> / <Money value={totals.withdrawals.amount} />
              </p>
            </div>
          </div>
        </AdminPanel>
      ) : null}

      <AdminPanel>
        <AdminPanelHeader title="Date range" />
        <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-caption font-medium transition-colors',
                preset === p.id
                  ? 'bg-accent-500/20 text-accent-200'
                  : 'text-fg-muted hover:bg-white/[0.04] hover:text-fg',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 border-t border-white/[0.06] p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
          <FormField label="From">
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setPreset('custom')
                setFrom(e.target.value)
              }}
            />
          </FormField>
          <FormField label="To">
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setPreset('custom')
                setTo(e.target.value)
              }}
            />
          </FormField>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Filters" description="Applied to the export only" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:p-5">
          <FormField label="User / ID">
            <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Name or user ID" />
          </FormField>
          <FormField label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@email.com" />
          </FormField>
          <FormField label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1…" />
          </FormField>
          <FormField label="Country">
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. IN" />
          </FormField>
          <FormField label="Status">
            <Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="APPROVED" />
          </FormField>
          <FormField label="Coin">
            <Input value={coin} onChange={(e) => setCoin(e.target.value)} placeholder="USDT" />
          </FormField>
          <FormField label="Network">
            <Input value={network} onChange={(e) => setNetwork(e.target.value)} placeholder="TRC20" />
          </FormField>
          <FormField label="Amount">
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Exact amount" />
          </FormField>
          <FormField label="Admin">
            <Input value={admin} onChange={(e) => setAdmin(e.target.value)} placeholder="Reviewer ID / email" />
          </FormField>
        </div>
      </AdminPanel>

      <AdminPanel glow>
        <AdminPanelHeader title="Report type" description="Select one report, then export." />
        <ul className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
          {REPORT_TYPES.map((r) => {
            const active = selected === r.id
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelected(r.id)}
                  className={cn(
                    'flex h-full w-full flex-col rounded-xl border px-4 py-3 text-left transition-colors',
                    active
                      ? 'border-accent-500/40 bg-accent-500/15'
                      : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]',
                  )}
                >
                  <span className="font-medium text-fg">{r.label}</span>
                  <span className="mt-1 text-caption text-fg-subtle">{r.description}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </AdminPanel>
    </div>
  )
}
