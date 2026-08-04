import { Router } from 'express'

import { adminRouter } from './admin.routes.js'
import { authRouter } from './auth.routes.js'
import { depositRouter } from './deposit.routes.js'
import { healthRouter } from './health.routes.js'
import { kycRouter } from './kyc.routes.js'
import { performanceRouter } from './performance.routes.js'
import { portfolioRouter } from './portfolio.routes.js'
import { profileRouter } from './profile.routes.js'
import { returnsRouter } from './returns.routes.js'
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
  router.use('/v1/admin', adminRouter)

  return router
}
