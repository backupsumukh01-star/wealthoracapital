import { API_ROUTES } from '@meridian/shared'

import { apiClient } from './http'
import { env } from '@/lib/env'

export type ProgressShareKind = 'journey' | 'daily'

export type ProgressShareLink = {
  token: string
  expiresAt: string
  shareUrl: string
  imageUrl: string
  journeyImageUrl: string
  dailyImageUrl: string
  journeyShareUrl: string
  dailyShareUrl: string
}

export type ProgressShareSnapshot = {
  displayName: string
  displayCurrency: string
  totalInvestment: string
  totalEarnings: string
  earningsTillDate: string
  currentValue: string
  performancePct: string
  todayEarnings: string
  dailyReturnPct: string
  asOfDate: string
  brandName: string
  portfolioHistory: { label: string; value: string }[]
  intradayPerformance: { label: string; value: string }[]
}

export const progressShareService = {
  createLink: () =>
    apiClient<ProgressShareLink>(API_ROUTES.progressShare.link, { method: 'POST' }),

  snapshot: (token?: string) => {
    const qs = token ? `?t=${encodeURIComponent(token)}` : ''
    return apiClient<ProgressShareSnapshot>(`${API_ROUTES.progressShare.snapshot}${qs}`)
  },

  async fetchImageBlob(opts?: {
    token?: string
    imageUrl?: string
    kind?: ProgressShareKind
  }): Promise<Blob> {
    const url =
      opts?.imageUrl ??
      (opts?.token
        ? `${env.NEXT_PUBLIC_API_URL}${API_ROUTES.progressShare.image}?t=${encodeURIComponent(opts.token)}&kind=${opts.kind ?? 'journey'}`
        : `${env.NEXT_PUBLIC_API_URL}${API_ROUTES.progressShare.image}?kind=${opts?.kind ?? 'journey'}`)

    const response = await fetch(url, {
      method: 'GET',
      credentials: opts?.token || opts?.imageUrl ? 'omit' : 'include',
    })
    if (!response.ok) {
      throw new Error('Could not load progress image.')
    }
    return response.blob()
  },
}
