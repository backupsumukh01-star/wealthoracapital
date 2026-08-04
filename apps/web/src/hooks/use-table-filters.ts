'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Filters, sort and pagination live in the URL, never in component state (docs/02 §4).
 *
 * Consequences that matter: a filtered table view is shareable, survives a refresh, and the
 * export endpoint can be handed the exact same query string — which is what guarantees the
 * downloaded file matches what the user is looking at.
 */
export function useTableFilters(defaults: Record<string, string> = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = useMemo(() => {
    const current: Record<string, string> = { ...defaults }
    searchParams.forEach((value, key) => {
      current[key] = value
    })
    return current
  }, [searchParams, defaults])

  const setFilters = useCallback(
    (next: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === undefined || value === '') {
          params.delete(key)
        } else {
          params.set(key, String(value))
        }
      }

      // Any filter change resets to page one; staying on page 7 of a new result set is a
      // guaranteed empty screen.
      if (!('page' in next)) params.delete('page')

      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  const hasActiveFilters = useMemo(() => {
    for (const key of searchParams.keys()) {
      if (key !== 'page') return true
    }
    return false
  }, [searchParams])

  /** The exact query string to hand to an export endpoint. */
  const queryString = searchParams.toString()

  return { filters, setFilters, clearFilters, hasActiveFilters, queryString }
}
