'use client'

import type { PaymentMethod } from '@meridian/shared'
import { Building2, Coins, QrCode, Smartphone, Wallet } from 'lucide-react'

import { QrFrame } from '@/components/dashboard/qr-frame'
import { CopyButton } from '@/components/ui/copy-button'
import { cn } from '@/lib/cn'

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/60 py-2.5 last:border-0">
      <span className="text-caption text-fg-subtle">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5 text-right text-body-sm text-fg">
        <span className="break-all font-medium tabular-nums">{value}</span>
        <CopyButton value={value} label={label} />
      </span>
    </div>
  )
}

function typeIcon(type: string) {
  if (type === 'UPI' || type === 'MOBILE_WALLET') return Smartphone
  if (type === 'BANK_TRANSFER') return Building2
  if (type === 'CRYPTO' || type.includes('USDT') || type === 'BTC' || type === 'ETH') return Coins
  return Wallet
}

export function DepositMethodCard({
  method,
  selected,
  onSelect,
  className,
  showActions = true,
}: {
  method: PaymentMethod
  selected?: boolean
  onSelect?: () => void
  className?: string
  showActions?: boolean
}) {
  const Icon = typeIcon(method.type)
  const wallets = (method.cryptoWallets ?? []).filter((w) => w.isActive !== false)
  const qr =
    method.upi?.qrCodeUrl ||
    method.bank?.qrCodeUrl ||
    wallets.find((w) => w.qrCodeUrl)?.qrCodeUrl ||
    null

  return (
    <article
      className={cn(
        'rounded-xl border border-line/80 bg-surface/40 p-4 transition sm:p-5',
        selected && 'border-accent/50 ring-1 ring-accent/30',
        onSelect && 'cursor-pointer hover:border-line',
        className,
      )}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect()
              }
            }
          : undefined
      }
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-inset/80">
          {method.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={method.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon className="h-5 w-5 text-fg-muted" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-body font-semibold text-fg">{method.name}</h3>
            <span className="rounded-md bg-inset/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-fg-muted">
              {method.type.replaceAll('_', ' ')}
            </span>
          </div>
          <p className="mt-1 text-caption text-fg-subtle">
            Min {method.minAmount}
            {method.maxAmount ? ` · Max ${method.maxAmount}` : ''}
            {method.processingTime ? ` · ${method.processingTime}` : ''}
          </p>
        </div>
      </div>

      {method.instructions ? (
        <p className="mt-3 whitespace-pre-wrap text-body-sm text-fg-muted">{method.instructions}</p>
      ) : null}

      {showActions ? (
        <div className="mt-4 space-y-3">
          {method.upi ? (
            <div className="rounded-lg border border-line/60 bg-inset/40 px-3">
              <DetailRow label="UPI ID" value={method.upi.upiId} />
              <DetailRow label="Account holder" value={method.upi.accountHolderName} />
            </div>
          ) : null}

          {method.bank ? (
            <div className="rounded-lg border border-line/60 bg-inset/40 px-3">
              <DetailRow label="Account holder" value={method.bank.accountHolderName} />
              <DetailRow label="Bank" value={method.bank.bankName} />
              <DetailRow label="Account number" value={method.bank.accountNumber} />
              <DetailRow label="IFSC" value={method.bank.ifscCode} />
              <DetailRow label="Branch" value={method.bank.branch ?? ''} />
              <DetailRow label="Account type" value={method.bank.accountType ?? ''} />
            </div>
          ) : null}

          {wallets.length > 0 ? (
            <ul className="space-y-3">
              {wallets.map((wallet) => (
                <li key={wallet.id} className="rounded-lg border border-line/60 bg-inset/40 p-3">
                  <p className="text-caption font-medium text-fg">
                    {wallet.label} · {wallet.coin} · {wallet.network}
                  </p>
                  <div className="mt-1 px-0">
                    <DetailRow label="Wallet address" value={wallet.address} />
                    <DetailRow label="Memo" value={wallet.memo ?? ''} />
                  </div>
                  {wallet.instructions ? (
                    <p className="mt-2 text-caption text-fg-subtle">{wallet.instructions}</p>
                  ) : null}
                  {wallet.qrCodeUrl ? (
                    <div className="mt-3 flex justify-center">
                      <QrFrame src={wallet.qrCodeUrl} label={`${wallet.coin} ${wallet.network} QR`} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {qr && !wallets.some((w) => w.qrCodeUrl) ? (
            <div className="flex flex-col items-center gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-caption text-fg-subtle">
                <QrCode className="h-3.5 w-3.5" aria-hidden />
                Scan to pay
              </div>
              <QrFrame src={qr} label={`${method.name} QR`} />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
