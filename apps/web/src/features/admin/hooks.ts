/**
 * Operator hooks. Scaffold.
 *
 * `useApplyDailyReturn` is the one mutation in the product that must never be optimistic. The
 * UI waits for the server's confirmed result and renders the run summary it returns — showing a
 * settlement as applied before the server says so would be a lie about somebody's balance.
 */

export const adminQueryKeys = {
  all: ['admin'] as const,
  overview: () => [...adminQueryKeys.all, 'overview'] as const,
  users: (filters?: Record<string, unknown>) => [...adminQueryKeys.all, 'users', filters ?? {}] as const,
  user: (id: string) => [...adminQueryKeys.all, 'user', id] as const,
  deposits: (filters?: Record<string, unknown>) =>
    [...adminQueryKeys.all, 'deposits', filters ?? {}] as const,
  deposit: (id: string) => [...adminQueryKeys.all, 'deposit', id] as const,
  withdrawals: (filters?: Record<string, unknown>) =>
    [...adminQueryKeys.all, 'withdrawals', filters ?? {}] as const,
  withdrawal: (id: string) => [...adminQueryKeys.all, 'withdrawal', id] as const,
  trades: (filters?: Record<string, unknown>) => [...adminQueryKeys.all, 'trades', filters ?? {}] as const,
  dailyReturn: () => [...adminQueryKeys.all, 'daily-return'] as const,
  dailyReturnRun: (id: string) => [...adminQueryKeys.all, 'daily-return', id] as const,
  auditLog: (filters?: Record<string, unknown>) =>
    [...adminQueryKeys.all, 'audit-log', filters ?? {}] as const,
  reports: (filters?: Record<string, unknown>) =>
    [...adminQueryKeys.all, 'reports', filters ?? {}] as const,
}
