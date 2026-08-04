import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

/**
 * Loading states are skeletons that match the final layout, never a centred spinner on a full
 * page — a spinner causes layout shift when the content lands and reads as broken (docs/09 §5).
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        'shimmer-surface animate-shimmer rounded-md bg-hover/60',
        className,
      )}
      {...props}
    />
  )
}

/** Convenience shapes so a skeleton block reads as the thing it is standing in for. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3.5', index === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}

export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-3 w-28" />
    </div>
  )
}
