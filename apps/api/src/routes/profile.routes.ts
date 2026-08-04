import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { avatarUpload, profileController } from '../controllers/profile.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import { idParamSchema } from '../validators/admin.validators.js'
import { updateProfileSchema } from '../validators/profile.validators.js'

export const profileRouter = Router()

profileRouter.use(authenticate)

profileRouter.get('/', requirePermission(PERMISSIONS['profile.view']), profileController.get)
profileRouter.patch(
  '/',
  requirePermission(PERMISSIONS['profile.edit']),
  validate(updateProfileSchema),
  profileController.update,
)
profileRouter.post(
  '/avatar',
  requirePermission(PERMISSIONS['profile.edit']),
  avatarUpload.single('avatar'),
  profileController.uploadAvatar,
)

profileRouter.get(
  '/sessions',
  requirePermission(PERMISSIONS['sessions.manage']),
  profileController.listSessions,
)
profileRouter.get(
  '/sessions/current',
  requirePermission(PERMISSIONS['sessions.manage']),
  profileController.currentSession,
)
profileRouter.delete(
  '/sessions/others',
  requirePermission(PERMISSIONS['sessions.manage']),
  profileController.terminateOtherSessions,
)
profileRouter.delete(
  '/sessions/:id',
  requirePermission(PERMISSIONS['sessions.manage']),
  validate(idParamSchema, 'params'),
  profileController.terminateSession,
)
