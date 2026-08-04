'use client'

import { SectionHeader } from '@/components/common/page-header'
import { Money } from '@/components/common/money'
import { Card } from '@/components/ui/card'
import { DEMO_WALLET } from '@/lib/dashboard-data'

const ROWS = [
  { label: 'Available balance', value: DEMO_WALLET.availableBalance },
  { label: 'Pending deposit', value: DEMO_WALLET.pendingDeposit },
  { label: 'Pending withdrawal', value: DEMO_WALLET.pendingWithdrawal },
  { label: 'Lifetime deposits', value: DEMO_WALLET.totalDeposited },
  { label: 'Lifetime withdrawals', value: DEMO_WALLET.totalWithdrawn },
  { label: 'Total profit', value: DEMO_WALLET.totalProfit, signed: true },
] as const

export function WalletSummary() {
  return (
    <Card variant="glass" padded="md" className="h-full">
      <SectionHeader
        title="Wallet summary"
        description="Liquidity and lifetime money movement."
        as="h3"
      />

      <ul className="space-y-3">
        {ROWS.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-xl border border-line bg-inset/35 px-3.5 py-3"
          >
            <span className="text-body-sm text-fg-muted">{row.label}</span>
            <Money
              value={row.value}
              signed={'signed' in row && row.signed}
              className="text-body-sm font-medium"
            />
          </li>
        ))}
      </ul>
    </Card>
  )
}
