'use client'

import { Skeleton } from '@/components/ui/skeleton'

/** Matching-layout shimmer for the wealth home first paint. */
export function DashboardHomeSkeleton() {
  return (
    <div className="space-y-6 lg:space-y-8" aria-busy aria-label="Loading dashboard">
      <div className="glass glass-edge overflow-hidden rounded-3xl p-5 sm:p-6 lg:p-7">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-3 h-8 w-72 max-w-full" />
        <Skeleton className="mt-6 h-3 w-28" />
        <Skeleton className="mt-3 h-12 w-56 max-w-full" />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
        <div className="mt-5 flex gap-3">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
        </div>
      </div>

      <div className="glass glass-edge overflow-hidden rounded-3xl p-5 sm:p-6">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-4 h-[220px] w-full rounded-2xl sm:h-[280px]" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
