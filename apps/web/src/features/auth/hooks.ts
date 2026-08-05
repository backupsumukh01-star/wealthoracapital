/**
 * Auth hooks: `useAuthSession`, `useLogin`, `useRegister`, `useLogout`, `useForgotPassword`,
 * `useResetPassword`, `useVerifyEmail`, `useResendVerification`, `useChangePassword`.
 *
 * On success, `useLogin` clears the entire query cache before seeding the new session —
 * leaving the previous user's cached balances in memory across a sign-in is a data leak,
 * not a performance win.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  authService,
  type AuthSessionPayload,
  type RegisterBody,
} from '@/services/auth.service'

export const authQueryKeys = {
  all: ['auth'] as const,
  session: () => [...authQueryKeys.all, 'session'] as const,
  sessions: () => [...authQueryKeys.all, 'sessions'] as const,
}

/** The API only has an `email` field on login — a username-looking identifier is sent as-is. */
function toLoginEmail(identifier: string) {
  const trimmed = identifier.trim()
  return trimmed.includes('@') ? trimmed.toLowerCase() : trimmed
}

export type LoginFormInput = { identifier: string; password: string; otp?: string }

export function useAuthSession() {
  return useQuery({
    queryKey: authQueryKeys.session(),
    queryFn: authService.me,
    retry: false,
    staleTime: 60_000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginFormInput) =>
      authService.login({
        email: toLoginEmail(input.identifier),
        password: input.password,
        otp: input.otp,
      }),
    onSuccess: (session: AuthSessionPayload) => {
      queryClient.clear()
      queryClient.setQueryData(authQueryKeys.session(), session)
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: RegisterBody) => authService.register(body),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      queryClient.clear()
      queryClient.setQueryData(authQueryKeys.session(), null)
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (body: { email: string }) => authService.forgotPassword(body),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (body: { token: string; password: string }) => authService.resetPassword(body),
  })
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (body: { token: string }) => authService.verifyEmail(body),
  })
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (body: { email: string }) => authService.resendVerification(body),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      authService.changePassword(body),
  })
}
