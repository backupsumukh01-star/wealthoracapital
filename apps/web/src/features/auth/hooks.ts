/**
 * Auth hooks: `useLogin`, `useRegister`, `useLogout`, `useVerifyEmail`, `useResetPassword`.
 *
 * Scaffold: intentionally empty. On success, `useLogin` must clear the entire query cache
 * before navigating — leaving the previous user's cached balances in memory across a sign-in is
 * a data leak, not a performance win.
 */

export const authQueryKeys = {
  all: ['auth'] as const,
  session: () => [...authQueryKeys.all, 'session'] as const,
  sessions: () => [...authQueryKeys.all, 'sessions'] as const,
}
