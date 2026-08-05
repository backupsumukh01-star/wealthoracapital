import { Router } from 'express'

import { issueCsrfCookie } from '../utils/csrf-cookie.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'

/**
 * Public CSRF bootstrap — GET sets readable `mfx_csrf` and returns the token.
 * Mounted at `/api/v1/csrf`.
 */
export const csrfRouter = Router()

csrfRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const csrfToken = issueCsrfCookie(res)
    sendSuccess(res, { csrfToken })
  }),
)
