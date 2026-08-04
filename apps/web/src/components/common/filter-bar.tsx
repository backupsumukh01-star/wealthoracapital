'use client'

import type { ReactNode } from 'react'
import { Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTableFilters } from '@/hooks/use-table-filters'
import { cn } from '@/lib/cn'

export interface FilterBarProps {
  /** The individual controls — selects, date ranges — supplied by the calling screen. */
  children?: ReactNode
  searchPlaceholder?: string
  showSearch?: boolean
  className?: string
}

/**
 * The container for a table's filters.
 *
 * It owns only the layout and the clear action; the filter values themselves live in the URL via
 * `useTableFilters`, so the bar has no state of its own and a filtered view stays shareable.
 */
export function FilterBar({
  children,
  searchPlaceholder = 'Search',
  showSearch = true,
  className,
}: FilterBarProps) {
  const { filters, setFilters, clearFilters, hasActiveFilters } = useTableFilters()

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end', className)}>
      {showSearch ? (
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <Input
            type="search"
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            prefix={<Search className="size-4" />}
            value={filters.q ?? ''}
            onChange={(event) => setFilters({ q: event.target.value })}
          />
        </div>
      ) : null}

      {children}

      {hasActiveFilters ? (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X aria-hidden />
          Clear filters
        </Button>
      ) : null}
    </div>
  )
}
