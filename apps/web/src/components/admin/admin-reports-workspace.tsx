'use client'

import { useState } from 'react'
import { FileSpreadsheet, FileText, Table2 } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'

const REPORT_TYPES = [
  { id: 'users', label: 'Users', description: 'Registrations, status, KYC, balances' },
  { id: 'country', label: 'Country', description: 'Breakdown by investor country' },
  { id: 'deposits', label: 'Deposits', description: 'Inflows by method and status' },
  { id: 'withdrawals', label: 'Withdrawals', description: 'Outflows and payout destinations' },
  { id: 'profit', label: 'Profit', description: 'Investor P/L and distributed returns' },
  { id: 'returns', label: 'Returns', description: 'Daily settlement runs and distribution' },
  { id: 'wallet', label: 'Wallet', description: 'Balances, adjustments, freezes' },
  { id: 'kyc', label: 'KYC', description: 'Verification queue outcomes' },
  { id: 'trade', label: 'Trade', description: 'Published trades and P/L' },
  { id: 'support', label: 'Support', description: 'Tickets, SLA, resolution codes' },
  { id: 'admin_logs', label: 'Admin Activity', description: 'Operator audit trail export' },
] as const

type ReportId = (typeof REPORT_TYPES)[number]['id']

export function AdminReportsWorkspace() {
  const [selected, setSelected] = useState<ReportId>('users')
  const [from, setFrom] = useState('2026-07-01')
  const [to, setTo] = useState('2026-08-03')
  const [user, setUser] = useState('')
  const [country, setCountry] = useState('')
  const [status, setStatus] = useState('')

  function download(format: 'CSV' | 'Excel' | 'PDF') {
    const report = REPORT_TYPES.find((r) => r.id === selected)!
    toast.success(`${format} export ready (demo)`, {
      description: `${report.label} · ${from} → ${to}${user ? ` · ${user}` : ''}${country ? ` · ${country}` : ''}${status ? ` · ${status}` : ''}`,
    })
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Advanced Reports"
        description="Filter by date, user, country, status, and domain — export CSV, Excel, or PDF."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => download('CSV')}>
              <FileSpreadsheet aria-hidden />
              CSV
            </Button>
            <Button type="button" variant="glass" onClick={() => download('Excel')}>
              <Table2 aria-hidden />
              Excel
            </Button>
            <Button type="button" onClick={() => download('PDF')}>
              <FileText aria-hidden />
              PDF
            </Button>
          </div>
        }
      />

      <AdminPanel>
        <AdminPanelHeader title="Filters" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5 sm:p-5">
          <FormField label="From">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </FormField>
          <FormField label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </FormField>
          <FormField label="User ID / email">
            <Input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Optional"
            />
          </FormField>
          <FormField label="Country">
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. IN"
            />
          </FormField>
          <FormField label="Status">
            <Input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="e.g. APPROVED"
            />
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
