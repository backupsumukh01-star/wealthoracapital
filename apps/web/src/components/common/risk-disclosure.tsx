import { AlertTriangle } from 'lucide-react'

import { RISK_DISCLOSURE } from '@/lib/constants'
import { cn } from '@/lib/cn'

/**
 * The risk statement, rendered from one constant.
 *
 * It appears on the landing page, above the deposit form, and in the footer. Having a single
 * source means the wording cannot drift between surfaces, which matters because this is a
 * compliance obligation rather than marketing copy (docs/00 §8).
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
      <p className={cn('text-caption text-fg-subtle', className)}>{RISK_DISCLOSURE}</p>
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
