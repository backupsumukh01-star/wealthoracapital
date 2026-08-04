import { Router } from 'express'

import { settingsController } from '../controllers/settings.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { validate } from '../middlewares/validate.js'
import { updateMySettingsSchema } from '../validators/settings.validators.js'

export const settingsRouter = Router()

settingsRouter.get('/public', settingsController.public)

settingsRouter.get('/me', authenticate, settingsController.me)
settingsRouter.patch(
  '/me',
  authenticate,
  validate(updateMySettingsSchema),
  settingsController.updateMe,
)
