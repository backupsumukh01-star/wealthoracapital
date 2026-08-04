'use client'

import { useMemo } from 'react'

interface UsePaginationOptions {
  page: number
  totalPages: number
  /** Page links either side of the current one before ellipsis takes over. */
  siblings?: number
}

export type PageToken = number | 'ellipsis'

/** Builds the `1 … 4 5 6 … 20` page token list. Pure — the component just renders it. */
export function usePagination({ page, totalPages, siblings = 1 }: UsePaginationOptions) {
  return useMemo<PageToken[]>(() => {
    if (totalPages <= 1) return []

    const maxVisible = siblings * 2 + 5
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    const left = Math.max(page - siblings, 1)
    const right = Math.min(page + siblings, totalPages)
    const showLeftEllipsis = left > 2
    const showRightEllipsis = right < totalPages - 1

    const tokens: PageToken[] = [1]
    if (showLeftEllipsis) tokens.push('ellipsis')

    for (let current = Math.max(left, 2); current <= Math.min(right, totalPages - 1); current++) {
      tokens.push(current)
    }

    if (showRightEllipsis) tokens.push('ellipsis')
    tokens.push(totalPages)

    return tokens
  }, [page, totalPages, siblings])
}
