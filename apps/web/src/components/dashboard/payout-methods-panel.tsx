'use client'

import { Plus } from 'lucide-react'

import { SectionHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/dashboard/status-pill'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CopyButton } from '@/components/ui/copy-button'
import { toast } from '@/components/ui/toast'
import { SAVED_CRYPTO_WALLETS, SAVED_INR_ACCOUNTS } from '@/lib/investor-demo-data'
import { cn } from '@/lib/cn'

export function PayoutMethodsPanel() {
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
        <ul className="mt-5 space-y-3">
          {SAVED_INR_ACCOUNTS.map((b) => (
            <li
              key={b.id}
              className={cn(
                'rounded-xl border px-4 py-3.5',
                b.primary ? 'border-accent-700/40 bg-accent-500/8' : 'border-line bg-inset/30',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-body-sm font-medium text-fg">{b.bankName}</p>
                <StatusPill status="APPROVED" />
              </div>
              <p className="mt-1 text-caption text-fg-muted">
                {b.accountName} · {b.accountNumberMasked} · {b.ifsc}
              </p>
            </li>
          ))}
        </ul>
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
        <ul className="mt-5 space-y-3">
          {SAVED_CRYPTO_WALLETS.map((w) => (
            <li key={w.id} className="rounded-xl border border-line bg-inset/30 px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-body-sm font-medium text-fg">{w.label}</p>
                <span className="text-caption text-fg-subtle">
                  {w.coin} · {w.network}
                </span>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <p className="min-w-0 flex-1 break-all font-mono text-caption text-fg-muted">
                  {w.address}
                </p>
                <CopyButton value={w.address} label="Wallet address" />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
