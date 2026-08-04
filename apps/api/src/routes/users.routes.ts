import { Router } from 'express'

import { usersController } from '../controllers/users.controller.js'
import { authenticate } from '../middlewares/authenticate.js'

export const usersRouter = Router()

usersRouter.get('/me', authenticate, usersController.me)
