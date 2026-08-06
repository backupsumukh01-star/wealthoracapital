import type { Request, Response } from 'express'

import {
  COOKIE_NAMES,
  accessTokenCookieOptions,
  clearAccessTokenCookieOptions,
  clearAllCsrfCookieVariants,
  clearCsrfCookieOptions,
  clearOauthStateCookieOptions,
  clearRefreshTokenCookieOptions,
  csrfCookieOptions,
  oauthStateCookieOptions,
  refreshTokenCookieOptions,
} from '../config/cookies.js'
import { env } from '../config/env.js'
import { authService } from '../services/auth.service.js'
import { googleOAuthService } from '../services/google-oauth.service.js'
import type { AuthTokens } from '../types/auth.types.js'
import { asyncHandler } from '../utils/async-handler.js'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
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
  clearAllCsrfCookieVariants(res)
  res.cookie(COOKIE_NAMES.csrf, tokens.csrfToken, csrfCookieOptions(tokens.refreshTokenMaxAgeMs))
}

function clearAuthCookies(res: Response): void {
  res.cookie(COOKIE_NAMES.accessToken, '', clearAccessTokenCookieOptions())
  res.cookie(COOKIE_NAMES.refreshToken, '', clearRefreshTokenCookieOptions())
  clearAllCsrfCookieVariants(res)
  res.cookie(COOKIE_NAMES.csrf, '', clearCsrfCookieOptions())
}

function oauthFailureRedirect(errorCode: string, next?: string | null): string {
  const base = `${env.APP_URL.replace(/\/$/, '')}/oauth/callback`
  const url = new URL(base)
  url.searchParams.set('error', errorCode)
  if (next) url.searchParams.set('next', next)
  return url.toString()
}

function mapOAuthError(err: unknown): string {
  if (err instanceof AppError) {
    if (err.statusCode === 503) return 'not_configured'
    if (err.code === 'ACCOUNT_SUSPENDED') return 'account_suspended'
    if (err.statusCode === 403) return 'forbidden'
    if (err.statusCode === 401) return 'invalid_state'
    return 'oauth_failed'
  }
  return 'oauth_failed'
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
    const data = await authService.resendVerification(req.body as ResendVerificationInput)
    sendSuccess(res, data)
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

  /** GET /auth/google — redirect to Google consent screen. */
  googleStart: asyncHandler(async (req, res) => {
    if (!googleOAuthService.isConfigured()) {
      res.redirect(302, oauthFailureRedirect('not_configured'))
      return
    }
    const redirect = typeof req.query.redirect === 'string' ? req.query.redirect : undefined
    const { url, stateCookie, stateCookieMaxAgeMs } = googleOAuthService.createAuthorizationRedirect({
      redirect,
    })
    res.cookie(COOKIE_NAMES.oauthState, stateCookie, oauthStateCookieOptions(stateCookieMaxAgeMs))
    res.redirect(302, url)
  }),

  /** GET /auth/google/callback — exchange code, set JWT cookies, redirect to web. */
  googleCallback: asyncHandler(async (req, res) => {
    const clearState = () => {
      res.cookie(COOKIE_NAMES.oauthState, '', clearOauthStateCookieOptions())
    }

    let frontendRedirect: string | undefined
    let adminIntent = false

    try {
      const errorParam = typeof req.query.error === 'string' ? req.query.error : undefined
      if (errorParam) {
        clearState()
        res.redirect(
          302,
          oauthFailureRedirect(errorParam === 'access_denied' ? 'access_denied' : 'oauth_failed'),
        )
        return
      }

      const code = typeof req.query.code === 'string' ? req.query.code : undefined
      const state = typeof req.query.state === 'string' ? req.query.state : undefined
      const nonceCookie = req.cookies?.[COOKIE_NAMES.oauthState] as string | undefined

      if (!code) {
        clearState()
        res.redirect(302, oauthFailureRedirect('oauth_failed'))
        return
      }

      frontendRedirect = googleOAuthService.parseAndValidateState(state, nonceCookie)
      try {
        adminIntent = new URL(frontendRedirect).searchParams.get('next') === 'admin'
      } catch {
        adminIntent = false
      }

      const { accessToken } = await googleOAuthService.exchangeCode(code)
      const profile = await googleOAuthService.fetchProfile(accessToken)
      const { tokens } = await googleOAuthService.completeLogin(
        profile,
        {
          ip: clientIp(req),
          userAgent: req.get('user-agent') ?? null,
        },
        { adminIntent },
      )

      setAuthCookies(res, tokens)
      clearState()
      res.redirect(302, frontendRedirect)
    } catch (err) {
      clearState()
      const code = mapOAuthError(err)
      logger.warn({ err, code }, 'Google OAuth callback failed')
      res.redirect(302, oauthFailureRedirect(code, adminIntent ? 'admin' : null))
    }
  }),
}
