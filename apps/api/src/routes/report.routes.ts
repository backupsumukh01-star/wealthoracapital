import { Router } from 'express'

import { reportController } from '../controllers/report.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { validate } from '../middlewares/validate.js'
import { exportReportSchema } from '../validators/report.validators.js'

export const reportRouter = Router()

reportRouter.use(authenticate)
reportRouter.post('/export', validate(exportReportSchema), reportController.export)
