'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAdminUsers } from '@/features/admin/hooks'
import { adminService } from '@/services/admin.service'

const selectClass =
  'h-10 w-full rounded-lg border border-white/10 bg-inset/60 px-3 text-body-sm text-fg'

export function AdminWalletManagerWorkspace() {
  const { data: usersData } = useAdminUsers()
  const users = usersData?.items ?? []
  const [userId, setUserId] = useState('')
  const [wallet, setWallet] = useState<'MAIN' | 'BONUS' | 'TRADING' | 'REFERRAL'>('MAIN')
  const [action, setAction] = useState<'ADJUST' | 'BONUS' | 'FREEZE' | 'UNLOCK'>('ADJUST')
  const [amount, setAmount] = useState('100.00')
  const [note, setNote] = useState('')

  const selectedUserId = userId || users[0]?.id || ''

  const { data: walletsData } = useQuery({
    queryKey: ['admin', 'wallets'],
    queryFn: () => adminService.wallets(),
  })

  const adjust = useMutation({
    mutationFn: (body: {
      amount: string
      direction: 'CREDIT' | 'DEBIT'
      reason: string
      idempotencyKey: string
    }) => adminService.adjustWallet(selectedUserId, body),
    onSuccess: () => {
      toast.success('Wallet adjustment applied')
      setNote('')
    },
    onError: (err: Error) => toast.error(err.message || 'Ledger adjust failed'),
  })

  const userLabel = useMemo(() => {
    const a = users.find((x) => x.id === selectedUserId)
    return a ? `${a.firstName} ${a.lastName}` : selectedUserId
  }, [users, selectedUserId])

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
            <select
              className={selectClass}
              value={selectedUserId}
              onChange={(e) => setUserId(e.target.value)}
            >
              {users.length === 0 ? (
                <option value="">No investors from API</option>
              ) : (
                users.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.firstName} {a.lastName} · {a.id}
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
            disabled={adjust.isPending}
            onClick={() => {
              if (!selectedUserId) {
                toast.error('Select an investor')
                return
              }
              if (!note.trim()) {
                toast.error('Audit note required')
                return
              }
              if (wallet !== 'MAIN') {
                toast.error('Ledger adjust requires API support for non-main wallets')
                return
              }
              if (action === 'FREEZE' || action === 'UNLOCK') {
                toast.error('Ledger adjust requires API — freeze/unlock is not available')
                return
              }
              const numeric = Number.parseFloat(amount)
              if (!Number.isFinite(numeric) || numeric === 0) {
                toast.error('Enter a valid amount')
                return
              }
              const direction: 'CREDIT' | 'DEBIT' =
                action === 'BONUS' || numeric > 0 ? 'CREDIT' : 'DEBIT'
              const resolvedDirection =
                action === 'ADJUST' && numeric < 0 ? 'DEBIT' : direction
              adjust.mutate({
                amount: Math.abs(numeric).toFixed(2),
                direction: resolvedDirection,
                reason: `${note.trim()} (${userLabel})`,
                idempotencyKey: crypto.randomUUID(),
              })
            }}
          >
            Apply
          </Button>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Wallet ledger" description="Balances from the admin wallets API." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-caption">
            <thead className="border-b border-white/[0.06] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-5">User</th>
                <th className="px-4 py-3 font-medium">Available</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium sm:px-5">Locked</th>
              </tr>
            </thead>
            <tbody>
              {(walletsData?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-fg-subtle sm:px-5">
                    No wallet data from API.
                  </td>
                </tr>
              ) : (
                (walletsData?.items ?? []).map((row) => (
                  <tr key={row.user.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-3 text-fg sm:px-5">
                      {row.user.firstName} {row.user.lastName}
                      <span className="mt-0.5 block font-mono text-[11px] text-fg-subtle">
                        {row.user.id}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-fg">{row.availableBalance}</td>
                    <td className="px-4 py-3 tabular-nums text-fg">{row.balance}</td>
                    <td className="px-4 py-3 tabular-nums text-fg-subtle sm:px-5">
                      {row.lockedBalance}
                    </td>
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
