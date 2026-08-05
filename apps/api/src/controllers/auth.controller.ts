import type { Request, Response } from 'express'

import {
  COOKIE_NAMES,
  accessTokenCookieOptions,
  clearAccessTokenCookieOptions,
  clearCsrfCookieOptions,
  clearRefreshTokenCookieOptions,
  csrfCookieOptions,
  refreshTokenCookieOptions,
} from '../config/cookies.js'
import { authService } from '../services/auth.service.js'
import type { AuthTokens } from '../types/auth.types.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '../validators/auth.validators.js'

function clientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? null
  }
  return req.ip ?? null
}

function setAuthCookies(res: Response, tokens: AuthTokens): void {
  res.cookie(
    COOKIE_NAMES.accessToken,
    tokens.accessToken,
    accessTokenCookieOptions(tokens.accessTokenMaxAgeMs),
  )
  res.cookie(
    COOKIE_NAMES.refreshToken,
    tokens.refreshToken,
    refreshTokenCookieOptions(tokens.refreshTokenMaxAgeMs),
  )
  res.cookie(COOKIE_NAMES.csrf, tokens.csrfToken, csrfCookieOptions(tokens.refreshTokenMaxAgeMs))
}

function clearAuthCookies(res: Response): void {
  res.cookie(COOKIE_NAMES.accessToken, '', clearAccessTokenCookieOptions())
  res.cookie(COOKIE_NAMES.refreshToken, '', clearRefreshTokenCookieOptions())
  res.cookie(COOKIE_NAMES.csrf, '', clearCsrfCookieOptions())
}

export const authController = {
  register: asyncHandler(async (req, res) => {
    const body = req.body as RegisterInput
    const data = await authService.register(body)
    sendSuccess(res, data, 201)
  }),

  login: asyncHandler(async (req, res) => {
    const body = req.body as LoginInput
    const result = await authService.login(body, {
      ip: clientIp(req),
      userAgent: req.get('user-agent') ?? null,
    })
    setAuthCookies(res, result.tokens)
    sendSuccess(res, {
      user: result.user,
      wallet: result.wallet,
      csrfToken: result.tokens.csrfToken,
    })
  }),

  logout: asyncHandler(async (req, res) => {
    await authService.logout(req.user?.sessionId)
    clearAuthCookies(res)
    sendSuccess(res, null)
  }),

  refresh: asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[COOKIE_NAMES.refreshToken] as string | undefined
    const tokens = await authService.refresh(refreshToken, {
      ip: clientIp(req),
      userAgent: req.get('user-agent') ?? null,
    })
    setAuthCookies(res, tokens)
    sendSuccess(res, { csrfToken: tokens.csrfToken })
  }),

  me: asyncHandler(async (req, res) => {
    const data = await authService.me(req.user!.id)
    sendSuccess(res, data)
  }),

  verifyEmail: asyncHandler(async (req, res) => {
    await authService.verifyEmail(req.body as VerifyEmailInput)
    sendSuccess(res, null)
  }),

  resendVerification: asyncHandler(async (req, res) => {
    await authService.resendVerification(req.body as ResendVerificationInput)
    sendSuccess(res, null)
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body as ForgotPasswordInput)
    sendSuccess(res, null)
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body as ResetPasswordInput)
    clearAuthCookies(res)
    sendSuccess(res, null)
  }),

  changePassword: asyncHandler(async (req, res) => {
    await authService.changePassword(req.user!.id, req.body as ChangePasswordInput)
    clearAuthCookies(res)
    sendSuccess(res, null)
  }),

  listSessions: asyncHandler(async (req, res) => {
    const sessions = await authService.listSessions(req.user!.id, req.user!.sessionId)
    sendSuccess(res, sessions)
  }),

  revokeSession: asyncHandler(async (req, res) => {
    const sessionId = req.params.id
    if (!sessionId) {
      sendSuccess(res, null)
      return
    }
    await authService.revokeSession(req.user!.id, sessionId, req.user!.sessionId)
    sendSuccess(res, null)
  }),
}
