import { Router } from 'express'

import { marketController } from '../controllers/market.controller.js'

/** Public market quotes — no auth. Prices are served only from the API (never browser keys). */
export const marketRouter = Router()

marketRouter.get('/quotes', marketController.quotes)
marketRouter.get('/status', marketController.status)
