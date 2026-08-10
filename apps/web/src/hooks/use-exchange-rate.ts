'use client'

import { useMemo } from 'react'
import {
  DEFAULT_CURRENCY_RATES,
  convertFromUsd,
  normalizeCurrencyRates,
} from '@meridian/shared'

import { usePublicSettings } from '@/features/cms/site'
import { DEFAULT_USD_INR_RATE, inrToUsdString, parseRate, usdToInrString } from '@/lib/fx'
import type { QueryHookOptions } from '@/lib/query-client'

/**
 * Live desk rates from public platform settings.
 * Conversion uses shared convertFromUsd (same formula as the API).
 * Falls back to seeded defaults while loading / on error.
 */
export function useExchangeRate(options?: QueryHookOptions) {
  const q = usePublicSettings(options)
  const rates = useMemo(() => {
    const fromApi = q.data?.currencyRates
    const withInr = {
      ...(fromApi ?? {}),
      ...(q.data?.usdInrRate ? { INR: q.data.usdInrRate } : {}),
    }
    return normalizeCurrencyRates(withInr)
  }, [q.data?.currencyRates, q.data?.usdInrRate])

  const inrRate = rates.INR || DEFAULT_USD_INR_RATE

  return {
    ...q,
    rates,
    rate: inrRate,
    usdToInr: (usd: string) => usdToInrString(usd, inrRate),
    inrToUsd: (inr: string) => inrToUsdString(inr, inrRate),
    convertFromUsd: (usd: string, to: string) => convertFromUsd(usd || '0', to, rates),
    parseRate: (raw?: string | null) => parseRate(raw ?? inrRate),
    defaults: DEFAULT_CURRENCY_RATES,
  }
}
