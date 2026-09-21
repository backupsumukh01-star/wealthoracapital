'use client'

import { useDisplayCurrency } from '@/hooks/use-display-currency'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

/**
 * Platform denomination is USD. Preference is presentation-only; ledger stays USD.
 */
export function DisplayCurrencySelector({
  className,
}: {
  className?: string
  triggerClassName?: string
}) {
  const { session } = useSession()
  useDisplayCurrency({ enabled: Boolean(session) })

  return (
    <div className={cn('flex items-center justify-between gap-3 py-1', className)}>
      <div className="min-w-0">
        <p className="text-body-sm font-medium text-fg">Display currency</p>
        <p className="text-caption text-fg-subtle">All balances and amounts are shown in US dollars.</p>
      </div>
      <p className="text-body-sm tabular-nums text-fg" aria-label="Display currency USD">
        USD ($)
      </p>
    </div>
  )
}
