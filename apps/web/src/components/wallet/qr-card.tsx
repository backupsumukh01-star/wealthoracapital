'use client'

import { QrFrame } from '@/components/dashboard/qr-frame'
import { CopyButton } from '@/components/ui/copy-button'
import { cn } from '@/lib/cn'

export function QrCard({
  address,
  label,
  className,
}: {
  address: string
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-inset/35 p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex justify-center">
        <QrFrame label={label ?? 'Scan address'} />
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-line/80 bg-base/40 px-3 py-2.5">
        <p className="min-w-0 flex-1 break-all font-mono text-caption text-fg">{address}</p>
        <CopyButton value={address} label="Wallet address" />
      </div>
    </div>
  )
}
