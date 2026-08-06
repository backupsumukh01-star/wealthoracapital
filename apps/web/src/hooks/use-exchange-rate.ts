'use client'

import { useMemo } from 'react'

import { usePublicSettings } from '@/features/cms/site'
import { DEFAULT_USD_INR_RATE, inrToUsdString, parseRate, usdToInrString } from '@/lib/fx'
import type { QueryHookOptions } from '@/lib/query-client'

/**
 * Live desk USD↔INR rate from public platform settings.
 * Falls back to the seeded default (93) while loading / on error.
 */
export function useExchangeRate(options?: QueryHookOptions) {
  const q = usePublicSettings(options)
  const rate = useMemo(() => {
    const raw = q.data?.usdInrRate
    return parseRate(raw).toFixed()
  }, [q.data?.usdInrRate])

  return {
    ...q,
    rate: rate || DEFAULT_USD_INR_RATE,
    usdToInr: (usd: string) => usdToInrString(usd, rate),
    inrToUsd: (inr: string) => inrToUsdString(inr, rate),
  }
}
