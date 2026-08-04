/**
 * Deposit hooks. Scaffold.
 *
 * `useCreateDeposit` must send an idempotency key. A retried submission after a flaky
 * connection must not create a second deposit request (docs/05 §Idempotency).
 */

export const depositQueryKeys = {
  all: ['deposits'] as const,
  list: (filters?: Record<string, unknown>) => [...depositQueryKeys.all, 'list', filters ?? {}] as const,
  detail: (id: string) => [...depositQueryKeys.all, 'detail', id] as const,
  methods: () => [...depositQueryKeys.all, 'methods'] as const,
}
