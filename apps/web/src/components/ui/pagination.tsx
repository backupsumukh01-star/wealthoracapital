'use client'

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

import { usePagination } from '@/hooks/use-pagination'
import { cn } from '@/lib/cn'

import { Button } from './button'

export interface PaginationProps {
  page: number
  totalPages: number
  total?: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ page, totalPages, total, onPageChange, className }: PaginationProps) {
  const tokens = usePagination({ page, totalPages })
  if (totalPages <= 1) return null

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-col items-center justify-between gap-4 sm:flex-row',
        className,
      )}
    >
      {total === undefined ? (
        <span />
      ) : (
        <p className="text-caption text-fg-subtle" data-numeric>
          Page {page} of {totalPages} · {total.toLocaleString()} results
        </p>
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden />
        </Button>

        {tokens.map((token, index) =>
          token === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="grid size-8 place-items-center text-fg-subtle"
              aria-hidden
            >
              <MoreHorizontal className="size-4" />
            </span>
          ) : (
            <Button
              key={token}
              variant={token === page ? 'secondary' : 'ghost'}
              size="icon-sm"
              onClick={() => onPageChange(token)}
              aria-label={`Page ${token}`}
              aria-current={token === page ? 'page' : undefined}
              className="tabular-nums"
            >
              {token}
            </Button>
          ),
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  )
}
