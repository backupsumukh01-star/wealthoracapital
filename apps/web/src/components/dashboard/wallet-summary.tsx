'use client'

import { SectionHeader } from '@/components/common/page-header'
import { DualMoney } from '@/components/common/dual-money'
import { Card } from '@/components/ui/card'
import { useWallet } from '@/features/wallet/hooks'
import { useExchangeRate } from '@/hooks/use-exchange-rate'
import { useSession } from '@/providers/session-provider'

export function WalletSummary() {
  const { session } = useSession()
  const { data: wallet } = useWallet({ enabled: Boolean(session) })
  const { usdToInr } = useExchangeRate({ enabled: Boolean(session) })
  const rows = [
    { label: 'Available balance', value: wallet?.availableBalance ?? '0.00' },
    { label: 'Locked balance', value: wallet?.lockedBalance ?? '0.00' },
    { label: 'Invested amount', value: wallet?.investedAmount ?? '0.00' },
    { label: 'Lifetime deposits', value: wallet?.totalDeposited ?? '0.00' },
    { label: 'Lifetime withdrawals', value: wallet?.totalWithdrawn ?? '0.00' },
    { label: 'Total profit', value: wallet?.totalProfit ?? '0.00', signed: true },
  ] as const

  return (
    <Card variant="glass" padded="md" className="h-full">
      <SectionHeader
        title="Wallet summary"
        description="Liquidity and lifetime money movement."
        as="h3"
      />

      <ul className="space-y-3">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-xl border border-line bg-inset/35 px-3.5 py-3"
          >
            <span className="text-body-sm text-fg-muted">{row.label}</span>
            <DualMoney
              usd={row.value}
              inr={usdToInr(row.value) || null}
              signed={'signed' in row && row.signed}
              className="text-body-sm font-medium justify-end"
            />
          </li>
        ))}
      </ul>
    </Card>
  )
}
