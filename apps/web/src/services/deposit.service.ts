import { ERROR_CODES, API_ROUTES, type Deposit } from '@meridian/shared'

import { ApiError, apiClient } from './http'

export type CreateDepositBody = {
  amount: string
  methodId: string
  userReference?: string
  idempotencyKey: string
}

export const depositService = {
  list: (query?: { status?: string; cursor?: string }) => {
    const params = new URLSearchParams()
    if (query?.status) params.set('status', query.status)
    if (query?.cursor) params.set('cursor', query.cursor)
    const qs = params.toString()
    return apiClient<{ items: Deposit[]; nextCursor: string | null }>(
      `${API_ROUTES.deposits.root}${qs ? `?${qs}` : ''}`,
    )
  },

  get: (id: string) => apiClient<Deposit>(`${API_ROUTES.deposits.root}/${id}`),

  methods: () => apiClient<import('@meridian/shared').PaymentMethod[]>(API_ROUTES.deposits.methods),

  create: (body: CreateDepositBody) =>
    apiClient<Deposit>(API_ROUTES.deposits.root, {
      method: 'POST',
      body,
      idempotencyKey: body.idempotencyKey,
    }),

  /** Multipart upload — wire to dedicated upload transport when API is live. */
  uploadProof: async (_id: string, _file: File): Promise<Deposit> => {
    throw new ApiError(
      ERROR_CODES.INTERNAL_ERROR,
      'Deposit proof upload is not connected to the API yet.',
      501,
    )
  },
}
