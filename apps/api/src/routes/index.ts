import { Router } from 'express'

import { env } from '../config/env.js'
import { adminRouter } from './admin.routes.js'
import { authRouter } from './auth.routes.js'
import { cmsRouter } from './cms.routes.js'
import { depositRouter } from './deposit.routes.js'
import { docsRouter, sendRedoc } from './docs.routes.js'
import { emailTrackingRouter } from './email-tracking.routes.js'
import { filesRouter } from './files.routes.js'
import { healthRouter } from './health.routes.js'
import { kycRouter } from './kyc.routes.js'
import { notificationRouter } from './notification.routes.js'
import { performanceRouter } from './performance.routes.js'
import { portfolioRouter } from './portfolio.routes.js'
import { profileRouter } from './profile.routes.js'
import { reportRouter } from './report.routes.js'
import { returnsRouter } from './returns.routes.js'
import { settingsRouter } from './settings.routes.js'
import { supportRouter } from './support.routes.js'
import { tradeRouter } from './trade.routes.js'
import { transactionRouter } from './transaction.routes.js'
import { usersRouter } from './users.routes.js'
import { walletRouter } from './wallet.routes.js'
import { withdrawalRouter } from './withdrawal.routes.js'

/**
 * Mounted at `/api` by the app factory.
 */
export function createApiRouter(): Router {
  const router = Router()

  router.use(healthRouter)
  if (env.ENABLE_API_DOCS) {
    router.use('/docs', docsRouter)
    router.get('/redoc', (req, res) => {
      sendRedoc(req, res)
    })
  }
  router.use('/v1/auth', authRouter)
  router.use('/v1/users', usersRouter)
  router.use('/v1/profile', profileRouter)
  router.use('/v1/kyc', kycRouter)
  router.use('/v1/wallet', walletRouter)
  router.use('/v1/deposits', depositRouter)
  router.use('/v1/withdrawals', withdrawalRouter)
  router.use('/v1/transactions', transactionRouter)
  router.use('/v1/trades', tradeRouter)
  router.use('/v1/performance', performanceRouter)
  router.use('/v1/portfolio', portfolioRouter)
  router.use('/v1/returns', returnsRouter)
  router.use('/v1/notifications', notificationRouter)
  router.use('/v1/support', supportRouter)
  router.use('/v1/settings', settingsRouter)
  router.use('/v1/reports', reportRouter)
  router.use('/v1/cms', cmsRouter)
  router.use('/v1/files', filesRouter)
  router.use('/v1/emails', emailTrackingRouter)
  router.use('/v1/admin', adminRouter)

  return router
}
