import { API_ROUTES, type SessionInfo, type User, type Wallet } from '@meridian/shared'

import { apiClient } from './http'

export type AuthSessionPayload = {
  user: User
  wallet: Wallet | null
}

export type LoginBody = { email: string; password: string; otp?: string }
export type RegisterBody = {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  country?: string
  referralCode?: string
  acceptTerms?: boolean
  acceptRisk?: boolean
}

/** Auth API — cookies carry session; no tokens in JS. */
export const authService = {
  register: (body: RegisterBody) =>
    apiClient<{ userId: string }>(API_ROUTES.auth.register, { method: 'POST', body }),

  login: (body: LoginBody) =>
    apiClient<AuthSessionPayload>(API_ROUTES.auth.login, { method: 'POST', body }),

  logout: () => apiClient<null>(API_ROUTES.auth.logout, { method: 'POST' }),

  me: () => apiClient<AuthSessionPayload>(API_ROUTES.auth.me),

  refresh: () => apiClient<null>(API_ROUTES.auth.refresh, { method: 'POST' }),

  verifyEmail: (body: { token: string }) =>
    apiClient<null>(API_ROUTES.auth.verifyEmail, { method: 'POST', body }),

  resendVerification: (body: { email: string }) =>
    apiClient<null>(API_ROUTES.auth.resendVerification, { method: 'POST', body }),

  forgotPassword: (body: { email: string }) =>
    apiClient<null>(API_ROUTES.auth.forgotPassword, { method: 'POST', body }),

  resetPassword: (body: { token: string; password: string }) =>
    apiClient<null>(API_ROUTES.auth.resetPassword, { method: 'POST', body }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiClient<null>(API_ROUTES.auth.changePassword, { method: 'POST', body }),

  listSessions: () => apiClient<SessionInfo[]>(API_ROUTES.auth.sessions),

  revokeSession: (sessionId: string) =>
    apiClient<null>(`${API_ROUTES.auth.sessions}/${sessionId}`, { method: 'DELETE' }),
}
