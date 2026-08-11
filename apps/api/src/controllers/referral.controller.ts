import { referralService } from '../services/finance/referral.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'
import type { referralListQuerySchema } from '../validators/referral.validators.js'
import type { z } from 'zod'

type ListQuery = z.infer<typeof referralListQuerySchema>

export const referralController = {
  summary: asyncHandler(async (req, res) => {
    sendSuccess(res, await referralService.summary(req.user!.id))
  }),

  network: asyncHandler(async (req, res) => {
    // Ownership: always the authenticated session user — ignore any client userId.
    sendSuccess(res, await referralService.network(req.user!.id))
  }),

  listRewards: asyncHandler(async (req, res) => {
    const query = req.query as ListQuery
    sendSuccess(
      res,
      await referralService.listRewards(req.user!.id, {
        cursor: query.cursor,
        limit: query.limit,
      }),
    )
  }),

  redeem: asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string }
    sendSuccess(res, await referralService.redeem(req.user!.id, id))
  }),
}
