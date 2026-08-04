/**
 * Session store contract (API-ready).
 * Today: `SessionProvider` + demo cookies.
 * Tomorrow: hydrate from `authService.me()` via React Query.
 */
export type SessionStoreState = {
  status: 'anonymous' | 'loading' | 'authenticated'
  userId: string | null
}

export const sessionStoreContract = {
  queryKey: ['session', 'me'] as const,
  service: 'authService.me' as const,
}
