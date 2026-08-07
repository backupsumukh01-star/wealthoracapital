import {
  API_ROUTES,
  type AuditLogEntry,
  type Deposit,
  type Trade,
  type User,
  type Withdrawal,
  type DailyReturnRun,
} from '@meridian/shared'

import { apiClient } from './http'
import type { AdminHealthSnapshot, PlatformCmsDocument, SearchHit } from '@/types/domain'

export const adminService = {
  health: () => apiClient<AdminHealthSnapshot>(API_ROUTES.admin.health),

  dashboard: () => apiClient<Record<string, unknown>>(API_ROUTES.admin.dashboard),

  dashboardOps: () =>
    apiClient<{
      generatedAt: string
      liveCards: Array<{
        id: string
        label: string
        count: number
        amount: string | null
        changePct: number
        href: string
      }>
      executiveKpis: Array<{
        id: string
        title: string
        cards: Array<{
          id: string
          label: string
          kind: 'count' | 'money' | 'percent'
          value: string
          href: string
        }>
      }>
      periods: Record<
        string,
        {
          period: string
          deposits: string
          depositsCount: number
          withdrawals: string
          withdrawalsCount: number
          profitDistributed: string
          platformBalance: string
          activeInvestments: string
          pendingDeposits: number
          pendingWithdrawals: number
        }
      >
      charts: {
        depositsPerDay: Array<{ day: string; value: number }>
        withdrawalsPerDay: Array<{ day: string; value: number }>
        depositVsWithdrawal: Array<{ day: string; deposits: number; withdrawals: number }>
        newUsers: Array<{ day: string; value: number }>
        profitDistributed: Array<{ day: string; value: number }>
        activeInvestorsGrowth: Array<{ day: string; value: number }>
        kycApprovals: Array<{ day: string; value: number }>
      }
      totals: {
        users: {
          total: number
          verified: number
          active: number
          suspended: number
          deleted: number
        }
        deposits: {
          total: number
          approved: number
          rejected: number
          pending: number
          amount: string
          approvedAmount: string
        }
        withdrawals: {
          total: number
          approved: number
          rejected: number
          pending: number
          paid: number
          amount: string
          paidAmount: string
        }
        kyc: { total: number; approved: number; rejected: number; pending: number }
        profit: { daily: string; monthly: string; lifetime: string; lifetimeCount: number }
        wallets: {
          available: string
          locked: string
          invested: string
          platformBalance: string
        }
      }
      pending: {
        deposits: Array<{
          id: string
          reference: string
          amount: string
          coin: string | null
          network: string | null
          method: string
          createdAt: string
          user: { id: string; name: string; email: string }
        }>
        withdrawals: Array<{
          id: string
          reference: string
          amount: string
          method: string
          createdAt: string
          user: { id: string; name: string; email: string }
        }>
        kyc: Array<{
          id: string
          userId: string
          country: string
          submittedAt: string
          status: string
          user: { id: string; name: string; email: string }
        }>
      }
      activity: Array<{
        id: string
        kind: string
        title: string
        description: string | null
        at: string
      }>
    }>(API_ROUTES.admin.dashboardOps),

  search: (q: string) =>
    apiClient<{ hits: SearchHit[] }>(
      `${API_ROUTES.admin.search}?q=${encodeURIComponent(q)}`,
    ),

  activity: (query?: { kind?: string; cursor?: string }) => {
    const params = new URLSearchParams()
    if (query?.kind) params.set('kind', query.kind)
    if (query?.cursor) params.set('cursor', query.cursor)
    const qs = params.toString()
    return apiClient<{
      items: Array<{
        id: string
        kind: string
        title: string
        description?: string | null
        at: string
      }>
    }>(`${API_ROUTES.admin.activity}${qs ? `?${qs}` : ''}`)
  },

  generateReport: (body: {
    type: string
    from?: string
    to?: string
    format: 'CSV' | 'XLSX' | 'PDF' | 'JSON'
    filters?: Record<string, string>
  }) =>
    apiClient<{ jobId: string; downloadUrl?: string | null; reference?: string }>(
      API_ROUTES.admin.reports,
      { method: 'POST', body },
    ),

  users: (query?: {
    q?: string
    cursor?: string
    page?: number
    limit?: number
    status?: string
    role?: string
    kycStatus?: string
  }) => {
    const params = new URLSearchParams()
    if (query?.q) params.set('q', query.q)
    if (query?.cursor) params.set('cursor', query.cursor)
    if (query?.page) params.set('page', String(query.page))
    if (query?.limit) params.set('limit', String(query.limit))
    if (query?.status) params.set('status', query.status)
    if (query?.role) params.set('role', query.role)
    if (query?.kycStatus) params.set('kycStatus', query.kycStatus)
    const qs = params.toString()
    return apiClient<{
      items: User[]
      nextCursor: string | null
      pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext?: boolean
      }
    }>(`${API_ROUTES.admin.users}${qs ? `?${qs}` : ''}`)
  },

  user: (id: string) => apiClient<User>(`${API_ROUTES.admin.users}/${id}`),

  addUserNote: (id: string, note: string) =>
    apiClient<User>(`${API_ROUTES.admin.users}/${id}/notes`, {
      method: 'POST',
      body: { note },
    }),

  deposits: (query?: { status?: string; q?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams()
    if (query?.status) params.set('status', query.status)
    if (query?.q) params.set('q', query.q)
    if (query?.page) params.set('page', String(query.page))
    if (query?.limit) params.set('limit', String(query.limit))
    const qs = params.toString()
    return apiClient<{
      items: Deposit[]
      pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext?: boolean
      }
    }>(`${API_ROUTES.admin.deposits}${qs ? `?${qs}` : ''}`)
  },

  deposit: (id: string) => apiClient<Deposit>(`${API_ROUTES.admin.deposits}/${id}`),

  reviewDeposit: (
    id: string,
    body: {
      decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFORMATION'
      reason?: string
      creditedAmount?: string
    },
  ) =>
    apiClient<Deposit>(`${API_ROUTES.admin.deposits}/${id}/review`, {
      method: 'POST',
      body,
      idempotencyKey: `dep-review-${id}-${body.decision}`,
    }),

  withdrawals: (query?: { status?: string; q?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams()
    if (query?.status) params.set('status', query.status)
    if (query?.q) params.set('q', query.q)
    if (query?.page) params.set('page', String(query.page))
    if (query?.limit) params.set('limit', String(query.limit))
    const qs = params.toString()
    return apiClient<{
      items: Withdrawal[]
      pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext?: boolean
      }
    }>(`${API_ROUTES.admin.withdrawals}${qs ? `?${qs}` : ''}`)
  },

  withdrawal: (id: string) =>
    apiClient<Withdrawal>(`${API_ROUTES.admin.withdrawals}/${id}`),

  reviewWithdrawal: (
    id: string,
    body: { decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFORMATION' | 'PAID'; reason?: string },
  ) =>
    apiClient<Withdrawal>(`${API_ROUTES.admin.withdrawals}/${id}/review`, {
      method: 'POST',
      body,
      idempotencyKey: `wd-review-${id}-${body.decision}`,
    }),

  suspendUser: (id: string, reason?: string) =>
    apiClient<User>(`${API_ROUTES.admin.users}/${id}/suspend`, {
      method: 'POST',
      body: { reason },
    }),

  enableUser: (id: string, reason?: string) =>
    apiClient<User>(`${API_ROUTES.admin.users}/${id}/enable`, {
      method: 'POST',
      body: { reason },
    }),

  updateUser: (
    id: string,
    body: Partial<{
      firstName: string
      lastName: string
      phone: string | null
      country: string | null
      timezone: string
      role: User['role']
      staffRole: User['staffRole']
    }>,
  ) =>
    apiClient<User & { revokedSessions?: number }>(`${API_ROUTES.admin.users}/${id}`, {
      method: 'PATCH',
      body,
    }),

  forceLogoutUser: (id: string) =>
    apiClient<{ revokedSessions: number }>(`${API_ROUTES.admin.users}/${id}/force-logout`, {
      method: 'POST',
      body: {},
    }),

  deleteUser: (id: string, body: { mode: 'soft' | 'hard'; reason?: string }) =>
    apiClient<{ id: string; deleted?: boolean } | User>(`${API_ROUTES.admin.users}/${id}/delete`, {
      method: 'POST',
      body,
    }),

  restoreUser: (id: string) =>
    apiClient<User>(`${API_ROUTES.admin.users}/${id}/restore`, {
      method: 'POST',
      body: {},
    }),

  wallets: (query?: { q?: string }) => {
    const params = new URLSearchParams()
    if (query?.q) params.set('q', query.q)
    const qs = params.toString()
    return apiClient<{
      items: Array<{
        user: { id: string; email: string; firstName: string; lastName: string }
        availableBalance: string
        balance: string
        lockedBalance: string
      }>
    }>(`${API_ROUTES.admin.wallets}${qs ? `?${qs}` : ''}`)
  },

  adjustWallet: (
    userId: string,
    body: { amount: string; direction: 'CREDIT' | 'DEBIT'; reason: string; idempotencyKey?: string },
  ) => {
    const idempotencyKey = body.idempotencyKey ?? crypto.randomUUID()
    return apiClient(`${API_ROUTES.admin.wallets}/${userId}/adjust`, {
      method: 'POST',
      body: {
        amount: body.amount,
        direction: body.direction,
        reason: body.reason,
        idempotencyKey,
      },
      idempotencyKey,
    })
  },

  performance: () =>
    apiClient<{
      summary: Record<string, unknown>
      analytics: Record<string, unknown>
      dailyReturns: Array<Record<string, unknown>>
    }>(API_ROUTES.admin.performance),

  trades: () => apiClient<{ items: Trade[] }>(API_ROUTES.admin.trades),

  createTrade: (body: {
    pair: string
    direction: 'BUY' | 'SELL'
    entryPrice: string
    exitPrice?: string
    returnPct?: string
    tradeDate: string
    adminNotes?: string
  }) =>
    apiClient<Trade>(API_ROUTES.admin.trades, {
      method: 'POST',
      body,
    }),

  publishTrade: (id: string) =>
    apiClient<Trade>(`${API_ROUTES.admin.trades}/${id}/publish`, { method: 'POST' }),

  returns: () => apiClient<{ items: DailyReturnRun[] }>(API_ROUTES.admin.returns),

  publishReturn: (body: {
    date: string
    returnPct: string
    idempotencyKey: string
    preview?: boolean
    notes?: string
    returnBasis?: 'BALANCE' | 'INVESTED'
  }) =>
    apiClient<DailyReturnRun>(API_ROUTES.admin.returns, {
      method: 'POST',
      body,
      idempotencyKey: body.idempotencyKey,
    }),

  audit: (query?: { q?: string; cursor?: string }) => {
    const params = new URLSearchParams()
    if (query?.q) params.set('q', query.q)
    if (query?.cursor) params.set('cursor', query.cursor)
    const qs = params.toString()
    return apiClient<{ items: AuditLogEntry[] }>(
      `${API_ROUTES.admin.audit}${qs ? `?${qs}` : ''}`,
    )
  },

  roles: () =>
    apiClient<{
      items: Array<{ roleKey: string; label: string; permissions: string[] }>
      matrix: {
        permissions: string[]
        roles: Array<{ roleKey: string; label: string }>
        matrix: Record<string, Record<string, boolean>>
      }
    }>(API_ROUTES.admin.roles),

  updateRoles: (
    rows: Array<{ roleKey: string; label: string; permissions: Record<string, boolean> }>,
  ) => apiClient(API_ROUTES.admin.roles, { method: 'PUT', body: rows }),

  backups: () =>
    apiClient<{ lastAt: string; nextAt: string; points: Array<{ id: string; label: string }> }>(
      API_ROUTES.admin.backups,
    ),

  createBackup: (scope: string) =>
    apiClient<{ id: string }>(API_ROUTES.admin.backups, { method: 'POST', body: { scope } }),

  getPlatformCms: () => apiClient<PlatformCmsDocument>(API_ROUTES.cms.platform),

  publishPlatformCms: (body: PlatformCmsDocument) =>
    apiClient<PlatformCmsDocument>(`${API_ROUTES.cms.platform}/publish`, {
      method: 'POST',
      body,
    }),

  paymentMethods: () =>
    apiClient<import('@meridian/shared').PaymentMethod[]>(API_ROUTES.admin.paymentMethods),

  createPaymentMethod: (body: Record<string, unknown>) =>
    apiClient<import('@meridian/shared').PaymentMethod>(API_ROUTES.admin.paymentMethods, {
      method: 'POST',
      body,
    }),

  updatePaymentMethod: (id: string, body: Record<string, unknown>) =>
    apiClient<import('@meridian/shared').PaymentMethod>(`${API_ROUTES.admin.paymentMethods}/${id}`, {
      method: 'PATCH',
      body,
    }),

  deletePaymentMethod: (id: string) =>
    apiClient(`${API_ROUTES.admin.paymentMethods}/${id}`, { method: 'DELETE' }),

  reorderPaymentMethods: (orderedIds: string[]) =>
    apiClient<import('@meridian/shared').PaymentMethod[]>(API_ROUTES.admin.paymentMethodsReorder, {
      method: 'POST',
      body: { orderedIds },
    }),

  walletAddresses: (paymentMethodId?: string) => {
    const qs = paymentMethodId ? `?paymentMethodId=${encodeURIComponent(paymentMethodId)}` : ''
    return apiClient<import('@meridian/shared').CryptoWalletAddress[]>(
      `${API_ROUTES.admin.walletAddresses}${qs}`,
    )
  },

  createWalletAddress: (body: Record<string, unknown>) =>
    apiClient<import('@meridian/shared').CryptoWalletAddress>(API_ROUTES.admin.walletAddresses, {
      method: 'POST',
      body,
    }),

  updateWalletAddress: (id: string, body: Record<string, unknown>) =>
    apiClient<import('@meridian/shared').CryptoWalletAddress>(
      `${API_ROUTES.admin.walletAddresses}/${id}`,
      { method: 'PATCH', body },
    ),

  deleteWalletAddress: (id: string) =>
    apiClient(`${API_ROUTES.admin.walletAddresses}/${id}`, { method: 'DELETE' }),
}
