'use client'

import { Check, Copy } from 'lucide-react'

import { CopyButton } from '@/components/ui/copy-button'
import { cn } from '@/lib/cn'

export function BankCard({
  accountName,
  bankName,
  accountNumber,
  ifsc,
  branch,
  selected,
  onSelect,
  masked,
  className,
}: {
  accountName: string
  bankName: string
  accountNumber: string
  ifsc: string
  branch?: string
  selected?: boolean
  onSelect?: () => void
  /** When true, hide copy and treat as selectable saved destination. */
  masked?: boolean
  className?: string
}) {
  const rows = [
    { label: 'Account name', value: accountName },
    { label: 'Bank name', value: bankName },
    { label: 'Account number', value: accountNumber },
    { label: 'IFSC', value: ifsc },
  ]

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-overline text-accent-300">{masked ? 'Saved bank' : 'Settlement account'}</p>
          <p className="mt-1 text-body font-medium text-fg">{bankName}</p>
          {branch ? <p className="mt-0.5 text-caption text-fg-subtle">{branch}</p> : null}
        </div>
        {selected ? (
          <span className="grid size-7 place-items-center rounded-full bg-accent-500/20 text-accent-200">
            <Check className="size-3.5" aria-hidden />
          </span>
        ) : null}
      </div>

      <dl className="mt-4 space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3">
            <dt className="text-caption text-fg-subtle">{row.label}</dt>
            <dd className="flex max-w-[65%] items-center gap-1 text-right text-body-sm font-medium text-fg">
              <span className="break-all tabular-nums">{row.value}</span>
              {!masked ? <CopyButton value={row.value} label={row.label} /> : null}
            </dd>
          </div>
        ))}
      </dl>
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
            ? 'border-accent-600/50 bg-accent-500/10 shadow-[0_0_24px_rgba(18,214,160,0.12)]'
            : 'border-line bg-inset/35 hover:border-line-strong hover:bg-hover/40',
          className,
        )}
      >
        {body}
      </button>
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-accent-700/35 bg-gradient-to-br from-accent-500/10 via-inset/50 to-hl-cyan/5 p-4 sm:p-5',
        className,
      )}
    >
      {body}
      <p className="mt-4 flex items-center gap-1.5 text-caption text-fg-subtle">
        <Copy className="size-3.5 shrink-0" aria-hidden />
        Tap a copy icon to paste into your banking app
      </p>
    </div>
  )
}
