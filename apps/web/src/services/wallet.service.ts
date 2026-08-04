import { API_ROUTES, type LedgerEntry, type Wallet, type WalletSummary } from '@meridian/shared'

import { apiClient } from './http'

export const walletService = {
  get: () => apiClient<Wallet>(API_ROUTES.wallet.root),

  summary: () => apiClient<WalletSummary>(API_ROUTES.wallet.summary),

  transactions: (query?: { cursor?: string; limit?: number }) => {
    const params = new URLSearchParams()
    if (query?.cursor) params.set('cursor', query.cursor)
    if (query?.limit) params.set('limit', String(query.limit))
    const qs = params.toString()
    return apiClient<{ items: LedgerEntry[]; nextCursor: string | null }>(
      `${API_ROUTES.wallet.transactions}${qs ? `?${qs}` : ''}`,
    )
  },
}
