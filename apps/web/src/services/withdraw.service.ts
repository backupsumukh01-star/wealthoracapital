import { API_ROUTES, type PayoutMethod, type Withdrawal } from '@meridian/shared'

import { apiClient } from './http'

export type CreateWithdrawalBody = {
  amount: string
  payoutMethodId: string
  idempotencyKey: string
}

export const withdrawService = {
  list: (query?: { status?: string; cursor?: string }) => {
    const params = new URLSearchParams()
    if (query?.status) params.set('status', query.status)
    if (query?.cursor) params.set('cursor', query.cursor)
    const qs = params.toString()
    return apiClient<{ items: Withdrawal[]; nextCursor: string | null }>(
      `${API_ROUTES.withdrawals.root}${qs ? `?${qs}` : ''}`,
    )
  },

  get: (id: string) => apiClient<Withdrawal>(`${API_ROUTES.withdrawals.root}/${id}`),

  limits: () =>
    apiClient<{ min: string; max: string; dailyRemaining: string; feePct: string }>(
      API_ROUTES.withdrawals.limits,
    ),

  payoutMethods: () =>
    apiClient<PayoutMethod[]>(`${API_ROUTES.withdrawals.root}/methods`),

  create: (body: CreateWithdrawalBody) =>
    apiClient<Withdrawal>(API_ROUTES.withdrawals.root, {
      method: 'POST',
      body,
      idempotencyKey: body.idempotencyKey,
    }),

  cancel: (id: string) =>
    apiClient<Withdrawal>(`${API_ROUTES.withdrawals.root}/${id}/cancel`, { method: 'POST' }),
}
