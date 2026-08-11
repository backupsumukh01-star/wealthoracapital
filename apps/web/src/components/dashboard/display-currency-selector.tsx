'use client'

import type { DisplayCurrency } from '@meridian/shared'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDisplayCurrency } from '@/hooks/use-display-currency'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

/**
 * Saves UserProfile.displayCurrency via PATCH /settings/me.
 * Presentation preference only — wallet/ledger stay USD.
 */
export function DisplayCurrencySelector({
  className,
  triggerClassName,
}: {
  className?: string
  triggerClassName?: string
}) {
  const { session } = useSession()
  const { displayCurrency, currencies, isLoading, isSaving, setDisplayCurrency } =
    useDisplayCurrency({ enabled: Boolean(session) })

  return (
    <div className={cn('flex items-center justify-between gap-3 py-1', className)}>
      <div className="min-w-0">
        <p className="text-body-sm font-medium text-fg">Display Currency</p>
        <p className="text-caption text-fg-subtle">
          Converts money displays where applicable. Accounting stays in USD.
        </p>
      </div>
      <Select
        value={displayCurrency}
        disabled={isLoading || isSaving || !session}
        onValueChange={(v) => void setDisplayCurrency(v as DisplayCurrency)}
      >
        <SelectTrigger className={cn('w-[7.5rem]', triggerClassName)} aria-label="Display Currency">
          <SelectValue placeholder="USD" />
        </SelectTrigger>
        <SelectContent>
          {currencies.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
