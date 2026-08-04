'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAdminOs } from '@/providers/admin-os-provider'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'

const selectClass =
  'h-10 w-full rounded-lg border border-white/10 bg-inset/60 px-3 text-body-sm text-fg'

export function AdminWalletManagerWorkspace() {
  const { state, adjustWallet } = useAdminOs()
  const { accounts } = useInvestorLifecycle()
  const [userId, setUserId] = useState(accounts[0]?.userId ?? 'USR_1001')
  const [wallet, setWallet] = useState<'MAIN' | 'BONUS' | 'TRADING' | 'REFERRAL'>('MAIN')
  const [action, setAction] = useState<'ADJUST' | 'BONUS' | 'FREEZE' | 'UNLOCK'>('ADJUST')
  const [amount, setAmount] = useState('100.00')
  const [note, setNote] = useState('')

  const userLabel = useMemo(() => {
    const a = accounts.find((x) => x.userId === userId)
    return a ? `${a.firstName} ${a.lastName}` : userId
  }, [accounts, userId])

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Wallet Manager"
        description="Adjust main, bonus, trading, or referral wallets. Freeze / unlock with audit notes."
      />

      <AdminPanel>
        <AdminPanelHeader title="Adjust wallet" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <FormField label="Investor">
            <select className={selectClass} value={userId} onChange={(e) => setUserId(e.target.value)}>
              {accounts.length === 0 ? (
                <option value="USR_1001">USR_1001 (seed)</option>
              ) : (
                accounts.map((a) => (
                  <option key={a.userId} value={a.userId}>
                    {a.firstName} {a.lastName} · {a.userId}
                  </option>
                ))
              )}
            </select>
          </FormField>
          <FormField label="Wallet">
            <select
              className={selectClass}
              value={wallet}
              onChange={(e) => setWallet(e.target.value as typeof wallet)}
            >
              <option value="MAIN">Main</option>
              <option value="BONUS">Bonus</option>
              <option value="TRADING">Trading</option>
              <option value="REFERRAL">Referral</option>
            </select>
          </FormField>
          <FormField label="Action">
            <select
              className={selectClass}
              value={action}
              onChange={(e) => setAction(e.target.value as typeof action)}
            >
              <option value="ADJUST">Adjust</option>
              <option value="BONUS">Bonus credit</option>
              <option value="FREEZE">Freeze</option>
              <option value="UNLOCK">Unlock</option>
            </select>
          </FormField>
          <FormField label="Amount">
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
          </FormField>
          <FormField label="Audit note" className="sm:col-span-2">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </FormField>
        </div>
        <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
          <Button
            type="button"
            onClick={() => {
              if (!note.trim()) {
                toast.error('Audit note required')
                return
              }
              adjustWallet({ userId, userLabel, wallet, action, amount, note })
              toast.success('Wallet action recorded')
              setNote('')
            }}
          >
            Apply
          </Button>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Wallet ledger" description="Immutable demo history." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">When</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Wallet</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium sm:px-5">Note</th>
              </tr>
            </thead>
            <tbody>
              {state.walletLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-fg-subtle sm:px-5">
                    No wallet adjustments yet.
                  </td>
                </tr>
              ) : (
                state.walletLedger.map((row) => (
                  <tr key={row.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-3 text-fg-muted sm:px-5">
                      {new Date(row.at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-fg">{row.userLabel}</td>
                    <td className="px-4 py-3 text-fg-muted">{row.wallet}</td>
                    <td className="px-4 py-3 text-fg-muted">{row.action}</td>
                    <td className="px-4 py-3 tabular-nums text-fg">{row.amount}</td>
                    <td className="px-4 py-3 text-fg-subtle sm:px-5">{row.note}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  )
}
