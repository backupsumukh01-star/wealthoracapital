import { cn } from '@/lib/cn'

/** Compact historical-performance disclaimer for marketing surfaces. */
export function HistoricalNote({ className }: { className?: string }) {
  return (
    <p className={cn('text-caption text-fg-subtle', className)}>
      Trading involves risk. Historical performance is provided for transparency only. Past
      performance does not guarantee future results.
    </p>
  )
}
