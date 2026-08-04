import { Router } from 'express'

import { PERMISSIONS } from '../config/permissions.js'
import { mediaController, mediaUpload } from '../controllers/media.controller.js'
import { requirePermission } from '../middlewares/require-permission.js'
import { validate } from '../middlewares/validate.js'
import {
  mediaListQuerySchema,
  mediaMetadataSchema,
  mediaMoveSchema,
  mediaRenameSchema,
} from '../validators/media.validators.js'

export const adminMediaRouter = Router()

adminMediaRouter.use(requirePermission(PERMISSIONS['media.manage']))

adminMediaRouter.get('/', validate(mediaListQuerySchema, 'query'), mediaController.list)
adminMediaRouter.post('/upload', mediaUpload.single('file'), mediaController.upload)
adminMediaRouter.get('/folders', mediaController.folders)
adminMediaRouter.get('/:id', mediaController.get)
adminMediaRouter.patch('/:id/rename', validate(mediaRenameSchema), mediaController.rename)
adminMediaRouter.patch('/:id/move', validate(mediaMoveSchema), mediaController.move)
adminMediaRouter.patch('/:id/metadata', validate(mediaMetadataSchema), mediaController.updateMetadata)
adminMediaRouter.post('/:id/restore', mediaController.restore)
adminMediaRouter.delete('/:id', mediaController.softDelete)
adminMediaRouter.delete('/:id/permanent', mediaController.permanentlyDelete)
