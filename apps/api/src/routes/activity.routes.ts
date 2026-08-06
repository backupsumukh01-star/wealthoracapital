import { Router } from 'express'
import { z } from 'zod'

import { authenticate } from '../middlewares/authenticate.js'
import { validate } from '../middlewares/validate.js'
import { activityService } from '../services/activity.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'

const listSchema = z.object({
  kind: z.string().optional(),
  category: z.enum(['deposits', 'withdrawals', 'kyc', 'profit', 'security']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().uuid().optional(),
})

export const activityRouter = Router()

activityRouter.use(authenticate)

activityRouter.get(
  '/',
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.query as z.infer<typeof listSchema>
    const data = await activityService.list({
      userId: req.user!.id,
      kind: q.kind as never,
      category: q.category,
      page: q.page ?? 1,
      limit: q.limit ?? 50,
      cursor: q.cursor,
      sortOrder: 'desc',
    })
    sendSuccess(res, data)
  }),
)
