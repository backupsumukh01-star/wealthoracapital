/**
 * Withdrawal hooks. Scaffold.
 *
 * A successful create must invalidate the wallet summary as well as the withdrawal list: the
 * requested amount is locked immediately, so a stale available balance would let the investor
 * request the same funds twice.
 */

export const withdrawalQueryKeys = {
  all: ['withdrawals'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...withdrawalQueryKeys.all, 'list', filters ?? {}] as const,
  detail: (id: string) => [...withdrawalQueryKeys.all, 'detail', id] as const,
  limits: () => [...withdrawalQueryKeys.all, 'limits'] as const,
}
