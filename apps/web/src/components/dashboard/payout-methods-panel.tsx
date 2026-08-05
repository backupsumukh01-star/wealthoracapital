'use client'

import { useMemo } from 'react'
import { Plus } from 'lucide-react'

import { SectionHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/dashboard/status-pill'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CopyButton } from '@/components/ui/copy-button'
import { toast } from '@/components/ui/toast'
import { usePayoutMethods } from '@/features/withdrawals/hooks'
import { cn } from '@/lib/cn'
import { useSession } from '@/providers/session-provider'

function isCryptoType(type: string) {
  return ['CRYPTO', 'USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH'].includes(type)
}

export function PayoutMethodsPanel() {
  const { session } = useSession()
  const { data: methods = [], isLoading } = usePayoutMethods({ enabled: Boolean(session) })

  const banks = useMemo(
    () => methods.filter((m) => !isCryptoType(m.type)),
    [methods],
  )
  const wallets = useMemo(
    () => methods.filter((m) => isCryptoType(m.type)),
    [methods],
  )

  return (
    <>
      <Card variant="glass" className="p-5 sm:p-6">
        <SectionHeader
          title="Bank accounts"
          description="INR destinations for withdrawals."
          as="h2"
          actions={
            <Button size="sm" variant="secondary" onClick={() => toast.info('Add bank is a UI preview.')}>
              <Plus aria-hidden />
              Add bank
            </Button>
          }
        />
        {isLoading ? (
          <p className="mt-5 text-body-sm text-fg-subtle">Loading payout methods…</p>
        ) : banks.length === 0 ? (
          <p className="mt-5 text-body-sm text-fg-subtle">No bank accounts configured.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {banks.map((b) => (
              <li
                key={b.id}
                className={cn(
                  'rounded-xl border px-4 py-3.5',
                  b.isDefault ? 'border-accent-700/40 bg-accent-500/8' : 'border-line bg-inset/30',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-body-sm font-medium text-fg">{b.label}</p>
                  <StatusPill status={b.isVerified ? 'APPROVED' : 'PENDING'} />
                </div>
                <p className="mt-1 text-caption text-fg-muted">{b.maskedDetails}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card variant="glass" className="p-5 sm:p-6">
        <SectionHeader
          title="Crypto wallets"
          description="Checked addresses only — typed destinations are not accepted at withdraw time."
          as="h2"
          actions={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => toast.info('Add wallet is a UI preview.')}
            >
              <Plus aria-hidden />
              Add wallet
            </Button>
          }
        />
        {isLoading ? (
          <p className="mt-5 text-body-sm text-fg-subtle">Loading wallets…</p>
        ) : wallets.length === 0 ? (
          <p className="mt-5 text-body-sm text-fg-subtle">No crypto wallets configured.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {wallets.map((w) => (
              <li key={w.id} className="rounded-xl border border-line bg-inset/30 px-4 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-body-sm font-medium text-fg">{w.label}</p>
                  <span className="text-caption text-fg-subtle">{w.type.replaceAll('_', ' ')}</span>
                </div>
                <div className="mt-2 flex items-start gap-2">
                  <p className="min-w-0 flex-1 break-all font-mono text-caption text-fg-muted">
                    {w.maskedDetails}
                  </p>
                  <CopyButton value={w.maskedDetails} label="Wallet address" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
