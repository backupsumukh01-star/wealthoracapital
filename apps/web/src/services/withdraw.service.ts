import {
  API_ROUTES,
  type MoneyString,
  type PaymentMethodType,
  type PayoutMethod,
  type Withdrawal,
} from '@meridian/shared'

import { apiClient } from './http'

export type CreateWithdrawalBody = {
  amount: string
  amountInr?: string
  payoutMethodId: string
  otp: string
  idempotencyKey: string
}

export type WithdrawalLimits = {
  min: MoneyString
  max: MoneyString
  dailyRemaining: MoneyString
  feePct: MoneyString
  availableBalance: MoneyString
  lockedBalance: MoneyString
}

export type CreatePayoutMethodBody = {
  label: string
  type: Extract<PaymentMethodType, 'UPI' | 'BANK_TRANSFER' | 'USDT_TRC20' | 'USDT_BEP20' | 'BTC' | 'ETH'>
  details: Record<string, string>
  isDefault?: boolean
}

export type UpdatePayoutMethodBody = {
  label?: string
  details?: Record<string, string>
  isDefault?: boolean
}

export type RequestWithdrawalOtpBody = {
  amount: string
  payoutMethodId: string
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

  limits: () => apiClient<WithdrawalLimits>(API_ROUTES.withdrawals.limits),

  payoutMethods: () =>
    apiClient<PayoutMethod[]>(API_ROUTES.withdrawals.methods),

  createPayoutMethod: (body: CreatePayoutMethodBody) =>
    apiClient<PayoutMethod>(API_ROUTES.withdrawals.methods, {
      method: 'POST',
      body,
    }),

  updatePayoutMethod: (id: string, body: UpdatePayoutMethodBody) =>
    apiClient<PayoutMethod>(API_ROUTES.withdrawals.method(id), {
      method: 'PATCH',
      body,
    }),

  deletePayoutMethod: (id: string) =>
    apiClient<{ id: string }>(API_ROUTES.withdrawals.method(id), {
      method: 'DELETE',
    }),

  setDefaultPayoutMethod: (id: string) =>
    apiClient<PayoutMethod>(API_ROUTES.withdrawals.methodDefault(id), {
      method: 'POST',
    }),

  requestOtp: (body: RequestWithdrawalOtpBody) =>
    apiClient<{ expiresAt?: string; maskedEmail?: string; message?: string }>(
      API_ROUTES.withdrawals.otp,
      {
        method: 'POST',
        body,
      },
    ),

  create: (body: CreateWithdrawalBody) =>
    apiClient<Withdrawal>(API_ROUTES.withdrawals.root, {
      method: 'POST',
      body,
      idempotencyKey: body.idempotencyKey,
    }),

  cancel: (id: string) =>
    apiClient<Withdrawal>(`${API_ROUTES.withdrawals.root}/${id}/cancel`, { method: 'POST' }),
}
