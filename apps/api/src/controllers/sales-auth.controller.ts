import type { Response } from 'express'

import {
  SALES_COOKIE_NAMES,
  clearSalesAccessTokenCookieOptions,
  clearSalesRefreshTokenCookieOptions,
  salesAccessTokenCookieOptions,
  salesRefreshTokenCookieOptions,
} from '../config/sales-cookies.js'
import { salesAuthService, type SalesAuthTokens } from '../services/sales-auth.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type { salesLoginSchema } from '../validators/sales.validators.js'
import type { z } from 'zod'

type LoginBody = z.infer<typeof salesLoginSchema>

function setSalesCookies(res: Response, tokens: SalesAuthTokens): void {
  res.cookie(
    SALES_COOKIE_NAMES.accessToken,
    tokens.accessToken,
    salesAccessTokenCookieOptions(tokens.accessTokenMaxAgeMs),
  )
  res.cookie(
    SALES_COOKIE_NAMES.refreshToken,
    tokens.refreshToken,
    salesRefreshTokenCookieOptions(tokens.refreshTokenMaxAgeMs),
  )
}

function clearSalesCookies(res: Response): void {
  res.cookie(SALES_COOKIE_NAMES.accessToken, '', clearSalesAccessTokenCookieOptions())
  res.cookie(SALES_COOKIE_NAMES.refreshToken, '', clearSalesRefreshTokenCookieOptions())
}

export const salesAuthController = {
  login: asyncHandler(async (req, res) => {
    const result = await salesAuthService.login(req.body as LoginBody, requestContext(req))
    setSalesCookies(res, result.tokens)
    sendSuccess(res, { salesman: result.salesman })
  }),

  logout: asyncHandler(async (req, res) => {
    await salesAuthService.logout(req.salesman?.sessionId)
    clearSalesCookies(res)
    sendSuccess(res, null)
  }),

  refresh: asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[SALES_COOKIE_NAMES.refreshToken] as string | undefined
    const tokens = await salesAuthService.refresh(refreshToken, requestContext(req))
    setSalesCookies(res, tokens)
    sendSuccess(res, null)
  }),

  me: asyncHandler(async (req, res) => {
    const data = await salesAuthService.me(req.salesman!.id)
    sendSuccess(res, data)
  }),
}
