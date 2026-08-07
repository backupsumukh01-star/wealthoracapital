'use client'

import { Button } from '@/components/ui/button'

export type AdminListPaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext?: boolean
}

export function AdminListPagination({
  pagination,
  onPageChange,
}: {
  pagination?: AdminListPaginationMeta | null
  onPageChange: (page: number) => void
}) {
  if (!pagination || pagination.totalPages <= 1) return null
  const { page, totalPages, total } = pagination
  return (
    <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3 sm:px-5">
      <p className="text-caption text-fg-subtle">
        Page {page} of {totalPages}
        <span className="ml-2 tabular-nums">({total} total)</span>
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="glass"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="glass"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
