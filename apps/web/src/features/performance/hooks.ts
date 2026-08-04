/** Performance hooks. Scaffold. These figures change once a day, so they use the slow stale time. */

export const performanceQueryKeys = {
  all: ['performance'] as const,
  summary: () => [...performanceQueryKeys.all, 'summary'] as const,
  series: (range?: string) => [...performanceQueryKeys.all, 'series', range ?? 'all'] as const,
  monthly: () => [...performanceQueryKeys.all, 'monthly'] as const,
  yearly: () => [...performanceQueryKeys.all, 'yearly'] as const,
  distributions: (filters?: Record<string, unknown>) =>
    [...performanceQueryKeys.all, 'distributions', filters ?? {}] as const,
  public: () => [...performanceQueryKeys.all, 'public'] as const,
}
