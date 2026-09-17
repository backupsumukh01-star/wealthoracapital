'use client'

import { Download } from 'lucide-react'

import { ActivityTimeline } from '@/components/dashboard/activity-timeline'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { useDeposits } from '@/features/deposits/hooks'
import { useWithdrawals } from '@/features/withdrawals/hooks'
import { useSession } from '@/providers/session-provider'

export function TransactionsWorkspace() {
  const { session } = useSession()
  const { data: depositsData } = useDeposits(undefined, { enabled: Boolean(session) })
  const { data: withdrawalsData } = useWithdrawals(undefined, { enabled: Boolean(session) })
  const deposits = depositsData?.items ?? []
  const withdrawals = withdrawalsData?.items ?? []

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6 lg:space-y-8">
      <PageHeader
        className="pb-2 sm:pb-4"
        title="History"
        description="Every credit and debit on a living timeline — not a spreadsheet."
        actions={
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => {
              const rows = [
                ...deposits.map((d) => ({
                  date: d.createdAt,
                  type: 'DEPOSIT',
                  label: `Deposit ${d.status.toLowerCase()}`,
                  reference: d.reference,
                  amount: d.amount,
                })),
                ...withdrawals.map((w) => ({
                  date: w.createdAt,
                  type: 'WITHDRAWAL',
                  label: `Withdrawal ${w.status.toLowerCase()}`,
                  reference: w.reference,
                  amount: `-${w.amount}`,
                })),
              ].sort((a, b) => (a.date < b.date ? 1 : -1))
              const header = 'date,type,label,reference,amount\n'
              const body = rows
                .map((r) => `${r.date},${r.type},${r.label},${r.reference},${r.amount}`)
                .join('\n')
              const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'wealthora-history.csv'
              a.click()
              URL.revokeObjectURL(url)
              toast.success('History exported')
            }}
          >
            <Download aria-hidden />
            Export
          </Button>
        }
      />

      <ActivityTimeline />
    </div>
  )
}
