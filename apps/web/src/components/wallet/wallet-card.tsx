'use client'

import { Check } from 'lucide-react'

import { CopyButton } from '@/components/ui/copy-button'
import { cn } from '@/lib/cn'
import { truncateMiddle } from '@/lib/format'

export function WalletCard({
  label,
  coin,
  network,
  address,
  selected,
  onSelect,
  showFullAddress,
  className,
}: {
  label: string
  coin: string
  network: string
  address: string
  selected?: boolean
  onSelect?: () => void
  showFullAddress?: boolean
  className?: string
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-overline text-accent-300">
            {coin} · {network}
          </p>
          <p className="mt-1 text-body font-medium text-fg">{label}</p>
        </div>
        {selected ? (
          <span className="grid size-7 place-items-center rounded-full bg-accent-500/20 text-accent-200">
            <Check className="size-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-start gap-2">
        <p className="min-w-0 flex-1 break-all font-mono text-caption text-fg-muted">
          {showFullAddress ? address : truncateMiddle(address, 10, 8)}
        </p>
        <CopyButton value={address} label="Wallet address" />
      </div>
    </>
  )

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full rounded-2xl border p-4 text-left transition-all',
          selected
            ? 'border-accent-600/50 bg-accent-500/10'
            : 'border-line bg-inset/35 hover:border-line-strong hover:bg-hover/40',
          className,
        )}
      >
        {body}
      </button>
    )
  }

  return (
    <div className={cn('rounded-2xl border border-line bg-inset/40 p-4', className)}>{body}</div>
  )
}
