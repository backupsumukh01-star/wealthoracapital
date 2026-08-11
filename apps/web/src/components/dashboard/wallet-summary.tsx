'use client'

import { SectionHeader } from '@/components/common/page-header'
import { Money } from '@/components/common/money'
import { Card } from '@/components/ui/card'
import { useWallet } from '@/features/wallet/hooks'
import { useDisplayCurrency } from '@/hooks/use-display-currency'
import { useExchangeRate } from '@/hooks/use-exchange-rate'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

export function WalletSummary() {
  const { session } = useSession()
  const { data: wallet } = useWallet({ enabled: Boolean(session) })
  const { convertFromUsd } = useExchangeRate({ enabled: Boolean(session) })
  const { displayCurrency } = useDisplayCurrency({ enabled: Boolean(session) })
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
        {rows.map((row) => {
          const converted =
            displayCurrency === 'USD' ? null : convertFromUsd(row.value, displayCurrency)
          const signed = 'signed' in row && row.signed
          return (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-inset/35 px-3.5 py-3"
            >
              <span className="text-body-sm text-fg-muted">{row.label}</span>
              <span className={cn('inline-flex flex-col gap-0.5 text-right')}>
                <Money
                  value={row.value}
                  currency="USD"
                  signed={signed}
                  size="sm"
                  className="font-medium"
                />
                {converted ? (
                  <span className="text-[11px] text-fg-subtle tabular-nums">
                    <Money
                      value={converted}
                      currency={displayCurrency}
                      signed={signed}
                      size="inherit"
                      className="text-fg-subtle"
                    />
                  </span>
                ) : null}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
