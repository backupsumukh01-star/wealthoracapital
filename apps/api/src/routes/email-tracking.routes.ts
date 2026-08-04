import { Router } from 'express'

import { emailTrackingController } from '../controllers/email-tracking.controller.js'

/** Public, unauthenticated pixel/redirect tracking endpoints — mounted at `/v1/emails`. */
export const emailTrackingRouter = Router()

emailTrackingRouter.get('/o/:token', emailTrackingController.open)
emailTrackingRouter.get('/c/:token', emailTrackingController.click)
