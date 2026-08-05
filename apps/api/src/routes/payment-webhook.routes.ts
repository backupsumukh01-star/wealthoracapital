import { Router } from 'express'

import { paymentWebhookController } from '../controllers/payment-integration.controller.js'
import { webhookRateLimiter } from '../middlewares/rate-limit.js'

/**
 * Public payment provider webhooks — authenticated by HMAC signature, not JWT/CSRF.
 */
export const paymentWebhookRouter = Router()

paymentWebhookRouter.use(webhookRateLimiter)
paymentWebhookRouter.post('/', paymentWebhookController.ingest)
paymentWebhookRouter.post('/payments', paymentWebhookController.ingest)
