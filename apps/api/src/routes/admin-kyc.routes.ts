import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { kycController } from '../controllers/kyc.controller.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { idParamSchema } from '../validators/admin.validators.js'
import {
  kycAdminListQuerySchema,
  kycCompatReviewSchema,
  kycRequestInfoBodySchema,
  kycReviewBodySchema,
} from '../validators/kyc.validators.js'

export const adminKycRouter = Router()

adminKycRouter.get(
  '/metrics',
  requirePermission(PERMISSIONS['kyc.view']),
  kycController.metrics,
)

adminKycRouter.get(
  '/',
  requirePermission(PERMISSIONS['kyc.view']),
  validate(kycAdminListQuerySchema, 'query'),
  kycController.adminList,
)

adminKycRouter.get(
  '/:id',
  requirePermission(PERMISSIONS['kyc.view']),
  validate(idParamSchema, 'params'),
  kycController.adminGet,
)

adminKycRouter.post(
  '/:id/approve',
  requirePermission(PERMISSIONS['kyc.review']),
  validate(idParamSchema, 'params'),
  validate(kycReviewBodySchema),
  kycController.approve,
)

adminKycRouter.post(
  '/:id/reject',
  requirePermission(PERMISSIONS['kyc.review']),
  validate(idParamSchema, 'params'),
  validate(kycRequestInfoBodySchema),
  kycController.reject,
)

adminKycRouter.post(
  '/:id/request-information',
  requirePermission(PERMISSIONS['kyc.review']),
  validate(idParamSchema, 'params'),
  validate(kycRequestInfoBodySchema),
  kycController.requestInformation,
)

adminKycRouter.post(
  '/:id/expire',
  requirePermission(PERMISSIONS['kyc.review']),
  validate(idParamSchema, 'params'),
  validate(kycReviewBodySchema),
  kycController.expire,
)

adminKycRouter.post(
  '/:id/reopen',
  requirePermission(PERMISSIONS['kyc.review']),
  validate(idParamSchema, 'params'),
  validate(kycReviewBodySchema),
  kycController.reopen,
)

adminKycRouter.post(
  '/:id/suspend',
  requirePermission(PERMISSIONS['kyc.review']),
  validate(idParamSchema, 'params'),
  validate(kycReviewBodySchema),
  kycController.suspend,
)

/** Compat with apps/web kycService.adminReview */
adminKycRouter.post(
  '/:id/review',
  requirePermission(PERMISSIONS['kyc.review']),
  validate(idParamSchema, 'params'),
  validate(kycCompatReviewSchema),
  kycController.compatReview,
)
