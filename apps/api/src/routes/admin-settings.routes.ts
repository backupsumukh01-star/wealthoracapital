import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { settingsController } from '../controllers/settings.controller.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { adminSettingsUpdateSchema, featureFlagsUpdateSchema } from '../validators/settings.validators.js'

export const adminSettingsRouter = Router()

adminSettingsRouter.get(
  '/settings',
  requirePermission(PERMISSIONS['settings.manage']),
  settingsController.adminGet,
)
adminSettingsRouter.put(
  '/settings',
  requirePermission(PERMISSIONS['settings.manage']),
  validate(adminSettingsUpdateSchema),
  settingsController.adminUpdate,
)

adminSettingsRouter.get(
  '/feature-flags',
  requirePermission(PERMISSIONS['settings.manage']),
  settingsController.featureFlags,
)
adminSettingsRouter.put(
  '/feature-flags',
  requirePermission(PERMISSIONS['settings.manage']),
  validate(featureFlagsUpdateSchema),
  settingsController.updateFeatureFlags,
)
