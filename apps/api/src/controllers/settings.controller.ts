import type { z } from 'zod'

import { settingsService } from '../services/settings.service.js'
import { asyncHandler } from '../utils/async-handler.js'
import { requestContext } from '../utils/request-context.js'
import { sendSuccess } from '../utils/response.js'
import type {
  adminSettingsUpdateSchema,
  featureFlagsUpdateSchema,
  updateMySettingsSchema,
} from '../validators/settings.validators.js'

type UpdateMeBody = z.infer<typeof updateMySettingsSchema>
type AdminUpdateBody = z.infer<typeof adminSettingsUpdateSchema>
type FeatureFlagsBody = z.infer<typeof featureFlagsUpdateSchema>

export const settingsController = {
  public: asyncHandler(async (_req, res) => {
    sendSuccess(res, await settingsService.getPublicSettings())
  }),

  me: asyncHandler(async (req, res) => {
    sendSuccess(res, await settingsService.getMySettings(req.user!.id))
  }),

  updateMe: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await settingsService.updateMySettings(
        req.user!.id,
        req.body as UpdateMeBody,
        requestContext(req),
      ),
    )
  }),

  adminGet: asyncHandler(async (_req, res) => {
    sendSuccess(res, await settingsService.adminGet())
  }),

  adminUpdate: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await settingsService.adminUpdate(
        req.user!.id,
        req.body as AdminUpdateBody,
        requestContext(req),
      ),
    )
  }),

  featureFlags: asyncHandler(async (_req, res) => {
    sendSuccess(res, await settingsService.listFeatureFlags())
  }),

  updateFeatureFlags: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await settingsService.updateFeatureFlags(
        req.user!.id,
        req.body as FeatureFlagsBody,
        requestContext(req),
      ),
    )
  }),
}
