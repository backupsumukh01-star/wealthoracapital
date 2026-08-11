import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { adminReferralController } from '../controllers/admin-referral.controller.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import {
  adminReferralListQuerySchema,
  adminReferralRelationshipsQuerySchema,
  referralRewardIdParamSchema,
} from '../validators/referral.validators.js'

export const adminReferralRouter = Router()

adminReferralRouter.get(
  '/summary',
  requirePermission(PERMISSIONS['finance.view']),
  adminReferralController.summary,
)

adminReferralRouter.get(
  '/rewards',
  requirePermission(PERMISSIONS['finance.view']),
  validate(adminReferralListQuerySchema, 'query'),
  adminReferralController.listRewards,
)

adminReferralRouter.get(
  '/rewards/:id',
  requirePermission(PERMISSIONS['finance.view']),
  validate(referralRewardIdParamSchema, 'params'),
  adminReferralController.getReward,
)

adminReferralRouter.get(
  '/relationships',
  requirePermission(PERMISSIONS['finance.view']),
  validate(adminReferralRelationshipsQuerySchema, 'query'),
  adminReferralController.listRelationships,
)
