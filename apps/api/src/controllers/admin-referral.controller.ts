import type { z } from 'zod'

import { referralService } from '../services/finance/referral.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/response.js'
import type {
  adminReferralListQuerySchema,
  adminReferralRelationshipsQuerySchema,
} from '../validators/referral.validators.js'

type ListQuery = z.infer<typeof adminReferralListQuerySchema>
type RelationshipsQuery = z.infer<typeof adminReferralRelationshipsQuerySchema>

export const adminReferralController = {
  summary: asyncHandler(async (_req, res) => {
    sendSuccess(res, await referralService.adminSummary())
  }),

  listRewards: asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListQuery
    sendSuccess(
      res,
      await referralService.adminListRewards({
        q: query.q,
        status: query.status,
        from: query.from,
        to: query.to,
        page: query.page,
        limit: query.limit,
      }),
    )
  }),

  getReward: asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string }
    sendSuccess(res, await referralService.adminGetReward(id))
  }),

  listRelationships: asyncHandler(async (req, res) => {
    const query = req.query as unknown as RelationshipsQuery
    sendSuccess(
      res,
      await referralService.adminListRelationships({
        q: query.q,
        from: query.from,
        to: query.to,
        page: query.page,
        limit: query.limit,
      }),
    )
  }),
}
