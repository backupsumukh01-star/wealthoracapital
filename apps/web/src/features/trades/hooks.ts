/** Trade hooks. Scaffold. Filters are part of the key so each filtered view caches separately. */

export const tradeQueryKeys = {
  all: ['trades'] as const,
  list: (filters?: Record<string, unknown>) => [...tradeQueryKeys.all, 'list', filters ?? {}] as const,
  detail: (id: string) => [...tradeQueryKeys.all, 'detail', id] as const,
  stats: (filters?: Record<string, unknown>) => [...tradeQueryKeys.all, 'stats', filters ?? {}] as const,
}
