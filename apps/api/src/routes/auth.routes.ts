import { Router } from 'express'

import { authController } from '../controllers/auth.controller.js'
import { authenticate, optionalAuthenticate } from '../middlewares/authenticate.js'
import { authRateLimiter, loginRateLimiter, oauthRateLimiter, verificationResendRateLimiter } from '../middlewares/rate-limit.js'
import { validate } from '../middlewares/validate.js'
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validators.js'

export const authRouter = Router()

authRouter.post('/register', authRateLimiter, validate(registerSchema), authController.register)
authRouter.post('/login', loginRateLimiter, validate(loginSchema), authController.login)
authRouter.post('/logout', optionalAuthenticate, authController.logout)
authRouter.post('/refresh', authController.refresh)
authRouter.get('/me', authenticate, authController.me)
authRouter.get('/google', oauthRateLimiter, authController.googleStart)
authRouter.get('/google/callback', oauthRateLimiter, authController.googleCallback)
authRouter.post('/verify-email', authRateLimiter, validate(verifyEmailSchema), authController.verifyEmail)
authRouter.post(
  '/verify-email/resend',
  authRateLimiter,
  verificationResendRateLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification,
)
authRouter.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
)
authRouter.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
)
authRouter.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
)
authRouter.get('/sessions', authenticate, authController.listSessions)
authRouter.delete('/sessions/:id', authenticate, authController.revokeSession)
