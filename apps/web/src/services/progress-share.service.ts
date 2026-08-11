import { API_ROUTES } from '@meridian/shared'

import { apiClient } from './http'
import { env } from '@/lib/env'

export type ProgressShareLink = {
  token: string
  expiresAt: string
  shareUrl: string
  imageUrl: string
}

export type ProgressShareSnapshot = {
  displayName: string
  displayCurrency: string
  totalInvestment: string
  totalEarnings: string
  earningsTillDate: string
  performancePct: string
  asOfDate: string
  brandName: string
}

export const progressShareService = {
  createLink: () =>
    apiClient<ProgressShareLink>(API_ROUTES.progressShare.link, { method: 'POST' }),

  snapshot: (token?: string) => {
    const qs = token ? `?t=${encodeURIComponent(token)}` : ''
    return apiClient<ProgressShareSnapshot>(`${API_ROUTES.progressShare.snapshot}${qs}`)
  },

  /** Fetch PNG via public image URL (token) or authenticated session cookie. */
  async fetchImageBlob(opts?: { token?: string; imageUrl?: string }): Promise<Blob> {
    const url =
      opts?.imageUrl ??
      (opts?.token
        ? `${env.NEXT_PUBLIC_API_URL}${API_ROUTES.progressShare.image}?t=${encodeURIComponent(opts.token)}`
        : `${env.NEXT_PUBLIC_API_URL}${API_ROUTES.progressShare.image}`)

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
