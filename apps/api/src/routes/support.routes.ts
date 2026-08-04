import { Router } from 'express'

import { supportController } from '../controllers/support.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { validate } from '../middlewares/validate.js'
import { createTicketSchema, replyTicketSchema } from '../validators/support.validators.js'

export const supportRouter = Router()

supportRouter.use(authenticate)

supportRouter.get('/tickets', supportController.listMine)
supportRouter.post('/tickets', validate(createTicketSchema), supportController.create)
supportRouter.get('/tickets/:id', supportController.get)
supportRouter.post('/tickets/:id/messages', validate(replyTicketSchema), supportController.reply)
