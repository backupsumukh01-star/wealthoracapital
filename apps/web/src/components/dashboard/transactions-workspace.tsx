'use client'

import { Download } from 'lucide-react'

import { ActivityTimeline } from '@/components/dashboard/activity-timeline'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { DEMO_LEDGER } from '@/lib/investor-demo-data'

export function TransactionsWorkspace() {
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
              const header = 'date,type,label,reference,amount\n'
              const body = DEMO_LEDGER.map(
                (r) => `${r.date},${r.type},${r.label},${r.reference},${r.amount}`,
              ).join('\n')
              const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'growzy-ledger-demo.csv'
              a.click()
              URL.revokeObjectURL(url)
              toast.success('CSV downloaded (demo)')
            }}
          >
            <Download aria-hidden />
            Export CSV
          </Button>
        }
      />

      <ActivityTimeline searchable />
    </div>
  )
}
