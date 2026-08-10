import type { z } from 'zod'

import { handoverResetService } from '../services/admin/handover-reset.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type { handoverPreviewSchema, handoverResetSchema } from '../validators/handover.validators.js'

type PreviewBody = z.infer<typeof handoverPreviewSchema>
type ResetBody = z.infer<typeof handoverResetSchema>

export const handoverController = {
  preview: asyncHandler(async (req, res) => {
    const body = req.body as PreviewBody
    const data = await handoverResetService.preview(body.mode, req.user!.id)
    sendSuccess(res, data)
  }),

  reset: asyncHandler(async (req, res) => {
    const body = req.body as ResetBody
    const ctx = requestContext(req)
    const data = await handoverResetService.execute({
      mode: body.mode,
      actorId: req.user!.id,
      confirmationPhrase: body.confirmationPhrase,
      confirm: body.confirm,
      backupAcknowledged: body.backupAcknowledged,
      ctx: { ip: ctx.ip, userAgent: ctx.userAgent },
    })
    sendSuccess(res, data)
  }),
}
