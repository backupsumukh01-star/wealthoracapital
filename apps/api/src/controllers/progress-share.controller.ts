import type { z } from 'zod'

import { progressShareService } from '../services/progress-share/progress-share.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'
import type { progressShareTokenQuerySchema } from '../validators/progress-share.validators.js'

type TokenQuery = z.infer<typeof progressShareTokenQuerySchema>

export const progressShareController = {
  /** Authenticated: mint share + image URLs. */
  createLink: asyncHandler(async (req, res) => {
    sendSuccess(res, await progressShareService.createLink(req.user!.id))
  }),

  /** Authenticated or token: safe JSON snapshot (no PII). */
  snapshot: asyncHandler(async (req, res) => {
    const query = req.query as TokenQuery
    const userId = await progressShareService.resolveUserId({
      authenticatedUserId: req.user?.id,
      token: query.t,
      userIdQuery: typeof query.userId === 'string' ? query.userId : undefined,
    })
    sendSuccess(res, await progressShareService.buildSnapshot(userId))
  }),

  /** Authenticated or token: 1080×1080 PNG. */
  image: asyncHandler(async (req, res) => {
    const query = req.query as TokenQuery
    const userId = await progressShareService.resolveUserId({
      authenticatedUserId: req.user?.id,
      token: query.t,
      userIdQuery: typeof query.userId === 'string' ? query.userId : undefined,
    })
    const { png } = await progressShareService.renderImage(userId)
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'private, max-age=300')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Disposition', 'inline; filename="growzy-progress.png"')
    res.status(200).send(png)
  }),
}
