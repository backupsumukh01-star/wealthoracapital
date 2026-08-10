import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'

import { RISK_DISCLOSURE } from '@/lib/constants'
import { cn } from '@/lib/cn'

/**
 * Full risk statement — used on the dedicated Risk Disclosure legal page and deposit flow.
 * Marketing pages use footer links + short past-performance note instead of repeating this card.
 */
export function RiskDisclosure({
  variant = 'block',
  className,
}: {
  variant?: 'block' | 'inline'
  className?: string
}) {
  if (variant === 'inline') {
    return (
      <p className={cn('text-caption text-fg-subtle', className)}>
        Past performance does not guarantee future results.{' '}
        <Link
          href={ROUTES.marketing.legal.riskDisclosure}
          className="underline decoration-line underline-offset-2 hover:text-fg"
        >
          Risk Disclosure
        </Link>
      </p>
    )
  }

  return (
    <aside
      className={cn(
        'flex gap-3 rounded-lg border border-warning/25 bg-warning-bg px-4 py-3.5',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div className="space-y-1">
        <p className="text-body-sm font-medium text-fg">Risk disclosure</p>
        <p className="text-caption text-fg-muted">{RISK_DISCLOSURE}</p>
      </div>
    </aside>
  )
}
