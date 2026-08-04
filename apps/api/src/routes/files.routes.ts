import { Router } from 'express'

import { filesController } from '../controllers/files.controller.js'

export const filesRouter = Router()

filesRouter.get('/download', filesController.download)
