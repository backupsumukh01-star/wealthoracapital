/** Wallet hooks. Scaffold — keys are fixed now so invalidations elsewhere can reference them. */

export const walletQueryKeys = {
  all: ['wallet'] as const,
  summary: () => [...walletQueryKeys.all, 'summary'] as const,
  transactions: (filters?: Record<string, unknown>) =>
    [...walletQueryKeys.all, 'transactions', filters ?? {}] as const,
}
