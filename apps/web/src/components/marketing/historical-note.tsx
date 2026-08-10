import { cn } from '@/lib/cn'

/** Compact past-performance note for marketing surfaces (full text on Risk Disclosure page). */
export function HistoricalNote({ className }: { className?: string }) {
  return (
    <p className={cn('text-caption text-fg-subtle', className)}>
      Past performance does not guarantee future results.
    </p>
  )
}
