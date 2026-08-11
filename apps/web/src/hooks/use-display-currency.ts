'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DEFAULT_DISPLAY_CURRENCY,
  DISPLAY_CURRENCIES,
  isDisplayCurrency,
  type DisplayCurrency,
} from '@meridian/shared'

import { toast } from '@/components/ui/toast'
import type { QueryHookOptions } from '@/lib/query-client'
import { settingsService } from '@/services/settings.service'

export const displayCurrencyQueryKey = ['settings', 'me', 'display-currency'] as const

function readDisplayCurrency(data: Record<string, unknown> | undefined): DisplayCurrency {
  const raw = typeof data?.displayCurrency === 'string' ? data.displayCurrency : DEFAULT_DISPLAY_CURRENCY
  return isDisplayCurrency(raw) ? raw : DEFAULT_DISPLAY_CURRENCY
}

/** User display-currency preference (presentation only — ledger stays USD). */
export function useDisplayCurrency(options?: QueryHookOptions) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: displayCurrencyQueryKey,
    queryFn: () => settingsService.me(),
    enabled: options?.enabled ?? true,
    select: readDisplayCurrency,
  })

  const mutation = useMutation({
    mutationFn: (next: DisplayCurrency) => settingsService.updateMe({ displayCurrency: next }),
    onSuccess: (data) => {
      queryClient.setQueryData(displayCurrencyQueryKey, data)
      toast.success('Display currency saved — ledger remains USD')
    },
    onError: () => {
      toast.error('Could not save display currency')
    },
  })

  return {
    displayCurrency: query.data ?? DEFAULT_DISPLAY_CURRENCY,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    setDisplayCurrency: (next: DisplayCurrency) => mutation.mutateAsync(next),
    isSaving: mutation.isPending,
    currencies: DISPLAY_CURRENCIES,
  }
}
