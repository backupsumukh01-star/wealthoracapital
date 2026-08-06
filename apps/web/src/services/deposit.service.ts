import { API_ROUTES, ERROR_CODES, type Deposit } from '@meridian/shared'

import { ApiError, apiClient } from './http'
import { env } from '@/lib/env'
import { ensureCsrfToken } from '@/lib/csrf'

export type CreateDepositBody = {
  amount: string
  methodId: string
  userReference?: string
  txHash?: string
  notes?: string
  submissionDetails?: Record<string, string>
  idempotencyKey: string
}

async function apiFormData<T>(path: string, form: FormData): Promise<T> {
  const run = async (forceCsrf: boolean) => {
    const csrf = await ensureCsrfToken(forceCsrf)
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      body: form,
    })
    const payload = (await response.json()) as
      | { success: true; data: T }
      | {
          success: false
          error: { code: string; message: string }
        }
    return { response, payload }
  }

  let { response, payload } = await run(false)
  if (!payload.success && payload.error.code === 'CSRF_REJECTED') {
    ;({ response, payload } = await run(true))
  }
  if (response.ok && payload.success) return payload.data
  throw new ApiError(
    (!payload.success && payload.error.code) || ERROR_CODES.INTERNAL_ERROR,
    (!payload.success && payload.error.message) || 'Upload failed.',
    response.status,
  )
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

  uploadProof: async (id: string, file: File): Promise<Deposit> => {
    const form = new FormData()
    form.append('file', file)
    return apiFormData<Deposit>(API_ROUTES.deposits.proof(id), form)
  },

  cancel: (id: string) => apiClient<Deposit>(API_ROUTES.deposits.cancel(id), { method: 'POST' }),
}
