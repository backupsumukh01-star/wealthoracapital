import { Router } from 'express'

import { currencyController } from '../controllers/currency.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { validate } from '../middlewares/validate.js'
import {
  convertQuerySchema,
  updateDisplayCurrencySchema,
} from '../validators/currency.validators.js'

export const currencyRouter = Router()

currencyRouter.get('/rates', currencyController.rates)
currencyRouter.get('/convert', validate(convertQuerySchema, 'query'), currencyController.convert)

currencyRouter.get('/me', authenticate, currencyController.mePreference)
currencyRouter.patch(
  '/me',
  authenticate,
  validate(updateDisplayCurrencySchema),
  currencyController.updateMePreference,
)
