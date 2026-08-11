import { ERROR_CODES } from '@meridian/shared'
import type { Session, User } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { AUTH_LIMITS, DUMMY_PASSWORD_HASH } from '../config/constants.js'
import { emailService } from '../emails/email.service.js'
import { toPublicUser } from '../models/user.mapper.js'
import { sessionRepository } from '../repositories/session.repository.js'
import { userRepository } from '../repositories/user.repository.js'
import { verificationTokenRepository } from '../repositories/verification-token.repository.js'
import type { AuthTokens, SessionContext } from '../types/auth.types.js'
import { generateReferralCode } from '../utils/crypto.js'
import {
  AppError,
  badRequest,
  forbidden,
  unauthorized,
} from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import { parseUserAgent } from '../utils/user-agent.js'
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '../validators/auth.validators.js'
import { activityService } from './activity.service.js'
import { opsAlertService } from './ops-alert.service.js'
import { passwordService } from './password.service.js'
import { tokenService } from './token.service.js'

async function allocateReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateReferralCode(AUTH_LIMITS.referralCodeLength)
    const existing = await userRepository.findByReferralCode(code)
    if (!existing) {
      return code
    }
  }
  return generateReferralCode(AUTH_LIMITS.referralCodeLength) + randomUUID().slice(0, 4)
}

async function issueAuthTokens(user: User, context: SessionContext): Promise<{
  tokens: AuthTokens
  session: Session
}> {
  const refresh = tokenService.createOpaqueRefreshToken()
  const familyId = randomUUID()
  const refreshTokenMaxAgeMs = tokenService.refreshTokenTtlMs()
  const accessTokenMaxAgeMs = tokenService.accessTokenTtlMs()

  const session = await sessionRepository.create({
    user: { connect: { id: user.id } },
    refreshTokenHash: refresh.hash,
    familyId,
    userAgent: context.userAgent?.slice(0, 400) ?? null,
    ip: context.ip,
    expiresAt: new Date(Date.now() + refreshTokenMaxAgeMs),
  })

  const accessToken = tokenService.signAccessToken({
    userId: user.id,
    role: user.role,
    staffRole: user.staffRole,
    sessionId: session.id,
  })

  return {
    session,
    tokens: {
      accessToken,
      refreshToken: refresh.raw,
      csrfToken: tokenService.createCsrfToken(),
      accessTokenMaxAgeMs,
      refreshTokenMaxAgeMs,
    },
  }
}

async function createVerificationToken(userId: string): Promise<string> {
  await verificationTokenRepository.invalidateActiveTokens(userId, 'EMAIL_VERIFICATION')
  const raw = tokenService.createOpaqueRefreshToken().raw
  const expiresAt = new Date(Date.now() + AUTH_LIMITS.emailVerificationTtlHours * 3_600_000)
  await verificationTokenRepository.create({
    user: { connect: { id: userId } },
    tokenHash: tokenService.hashToken(raw),
    type: 'EMAIL_VERIFICATION',
    expiresAt,
  })
  logger.info(
    {
      userId,
      tokenPrefix: raw.slice(0, 8),
      expiresAt: expiresAt.toISOString(),
      ttlHours: AUTH_LIMITS.emailVerificationTtlHours,
    },
    'Email verification token created',
  )
  return raw
}

/** Send verification email without failing the parent auth flow when transport errors. */
async function trySendVerificationEmail(input: {
  userId: string
  to: string
  firstName: string
  token: string
  reason: string
}): Promise<boolean> {
  try {
    await emailService.sendVerificationEmail({
      to: input.to,
      firstName: input.firstName,
      token: input.token,
    })
    logger.info(
      { userId: input.userId, to: input.to, reason: input.reason },
      'Verification email sent',
    )
    return true
  } catch (err) {
    logger.error(
      {
        err,
        userId: input.userId,
        to: input.to,
        reason: input.reason,
        message: err instanceof Error ? err.message : String(err),
      },
      'Verification email send failed',
    )
    return false
  }
}

async function assertVerificationResendAllowed(userId: string): Promise<void> {
  const latest = await verificationTokenRepository.findLatestByUserAndType(
    userId,
    'EMAIL_VERIFICATION',
  )
  if (latest) {
    const ageMs = Date.now() - latest.createdAt.getTime()
    const cooldownMs = AUTH_LIMITS.verificationResendCooldownSeconds * 1000
    if (ageMs < cooldownMs) {
      const retryAfterSec = Math.ceil((cooldownMs - ageMs) / 1000)
      throw new AppError(
        429,
        ERROR_CODES.RATE_LIMITED,
        `Please wait ${retryAfterSec}s before requesting another verification email.`,
        { retryAfterSec },
      )
    }
  }

  const since = new Date(Date.now() - 3_600_000)
  const sentLastHour = await verificationTokenRepository.countCreatedSince(
    userId,
    'EMAIL_VERIFICATION',
    since,
  )
  if (sentLastHour >= AUTH_LIMITS.verificationResendMaxPerHour) {
    throw new AppError(
      429,
      ERROR_CODES.RATE_LIMITED,
      'Too many verification emails. Try again in an hour.',
    )
  }
}

async function createPasswordResetToken(userId: string): Promise<string> {
  await verificationTokenRepository.invalidateActiveTokens(userId, 'PASSWORD_RESET')
  const raw = tokenService.createOpaqueRefreshToken().raw
  await verificationTokenRepository.create({
    user: { connect: { id: userId } },
    tokenHash: tokenService.hashToken(raw),
    type: 'PASSWORD_RESET',
    expiresAt: new Date(Date.now() + AUTH_LIMITS.passwordResetTtlHours * 3_600_000),
  })
  return raw
}

export const authService = {
  /** Issue access + refresh cookies/session for an already-authenticated user (password or OAuth). */
  async issueTokensForUser(user: User, context: SessionContext) {
    return issueAuthTokens(user, context)
  },

  async register(input: RegisterInput): Promise<{ userId: string; emailSent: boolean }> {
    const existing = await userRepository.findByEmail(input.email)

    // Unverified accounts: allow re-register to update password + resend link
    // (fixes "I registered but got no email / wrong password" when first email failed).
    if (existing && !existing.emailVerifiedAt) {
      logger.info(
        { userId: existing.id, email: input.email },
        'Registration for existing unverified email — refreshing credentials',
      )
      const passwordHash = await passwordService.hash(input.password)
      await userRepository.update(existing.id, {
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? existing.phone,
        country: input.country ?? existing.country,
        status: 'PENDING_VERIFICATION',
      })
      const token = await createVerificationToken(existing.id)
      const emailSent = await trySendVerificationEmail({
        userId: existing.id,
        to: existing.email,
        firstName: input.firstName,
        token,
        reason: 'register-unverified-retry',
      })
      return { userId: existing.id, emailSent }
    }

    if (existing) {
      await emailService.sendRegistrationAttemptEmail({
        to: existing.email,
        firstName: existing.firstName,
      }).catch((err) => {
        logger.warn({ err, email: input.email }, 'Registration-attempt email failed')
      })
      logger.info({ email: input.email }, 'Registration attempted for existing verified email')
      return { userId: randomUUID(), emailSent: true }
    }

    if (input.phone?.trim()) {
      const phoneOwner = await userRepository.findByPhone(input.phone.trim())
      if (phoneOwner) {
        throw badRequest('An account with this phone number already exists. Sign in or use a different number.')
      }
    }

    let referredById: string | null = null
    if (input.referralCode) {
      const referrer = await userRepository.findByReferralCode(input.referralCode.toUpperCase())
      if (!referrer) {
        throw badRequest('Invalid referral code.')
      }
      referredById = referrer.id
    }

    const passwordHash = await passwordService.hash(input.password)
    const referralCode = await allocateReferralCode()
    const now = new Date()

    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
      country: input.country ?? null,
      role: 'USER',
      status: 'PENDING_VERIFICATION',
      referralCode,
      ...(referredById ? { referredBy: { connect: { id: referredById } } } : {}),
      termsAcceptedAt: input.acceptTerms === false ? null : now,
      riskAcceptedAt: input.acceptRisk === false ? null : now,
    })

    logger.info(
      {
        userId: user.id,
        email: user.email,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt,
        hasPasswordHash: Boolean(user.passwordHash),
        passwordHashPrefix: user.passwordHash?.slice(0, 7),
      },
      'User row created on register',
    )

    const token = await createVerificationToken(user.id)
    const emailSent = await trySendVerificationEmail({
      userId: user.id,
      to: user.email,
      firstName: user.firstName,
      token,
      reason: 'register',
    })

    logger.info({ userId: user.id, emailSent }, 'User registered')
    if (referredById) {
      void import('./finance/referral-notification.service.js').then(
        ({ referralNotificationService }) => {
          void referralNotificationService.onReferredUserRegistered({
            referrerId: referredById!,
            refereeId: user.id,
          })
        },
      )
    }
    await activityService.record({
      userId: user.id,
      actorId: user.id,
      kind: 'REGISTRATION',
      title: 'Account registered',
    })
    await opsAlertService.notify({
      event: 'USER_REGISTERED',
      title: 'User registered',
      action: 'New investor account created',
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`.trim(),
      userEmail: user.email,
      adminPath: `/admin/users/${user.id}`,
      recordActivity: false,
    })
    return { userId: user.id, emailSent }
  },

  async login(
    input: LoginInput,
    context: SessionContext,
  ): Promise<{ user: ReturnType<typeof toPublicUser>; wallet: null; tokens: AuthTokens }> {
    const user = await userRepository.findByEmail(input.email)

    if (!user || !user.passwordHash) {
      await passwordService.verify(input.password, DUMMY_PASSWORD_HASH)
      logger.info(
        { email: input.email, found: Boolean(user), hasPasswordHash: Boolean(user?.passwordHash) },
        'Login failed: user missing or no password',
      )
      throw unauthorized('Incorrect email or password.')
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      logger.info({ userId: user.id }, 'Login failed: account locked')
      throw forbidden('Account temporarily locked due to failed login attempts.')
    }

    if (user.status === 'SUSPENDED' || user.status === 'BLOCKED') {
      logger.info({ userId: user.id, status: user.status }, 'Login failed: suspended')
      throw new AppError(403, ERROR_CODES.ACCOUNT_SUSPENDED, 'This account has been suspended.')
    }

    if (user.status === 'CLOSED' || user.status === 'ARCHIVED') {
      logger.info({ userId: user.id, status: user.status }, 'Login failed: closed/archived')
      throw unauthorized('Incorrect email or password.')
    }

    const valid = await passwordService.verify(input.password, user.passwordHash)
    if (!valid) {
      const failedLoginCount = user.failedLoginCount + 1
      const lockedUntil =
        failedLoginCount >= AUTH_LIMITS.maxFailedLogins
          ? new Date(Date.now() + AUTH_LIMITS.lockoutMinutes * 60_000)
          : null
      await userRepository.recordFailedLogin(user.id, failedLoginCount, lockedUntil)
      logger.info(
        { userId: user.id, failedLoginCount, locked: Boolean(lockedUntil) },
        'Login failed: password mismatch',
      )
      if (lockedUntil) {
        await emailService.sendSecurityAlertEmail({
          to: user.email,
          firstName: user.firstName,
          message: 'Your account was locked after multiple failed login attempts.',
        }).catch((err) => {
          logger.warn({ err, userId: user.id }, 'Security alert email failed')
        })
      }
      throw unauthorized('Incorrect email or password.')
    }

    if (user.twoFactorEnabled) {
      if (!input.otp) {
        throw badRequest('Two-factor authentication code is required.', {
          requiresOtp: true,
        })
      }
      // TOTP verification lands with the 2FA feature; reject placeholder codes for now.
      throw badRequest('Two-factor authentication is enabled but not yet available.')
    }

    if (!user.emailVerifiedAt) {
      logger.info(
        { userId: user.id, status: user.status },
        'Login blocked: email not verified',
      )
      // Do not rotate the verification token here — that would invalidate the link
      // already sitting in the user's inbox. Resend is available on /verify-email.
      throw new AppError(
        403,
        ERROR_CODES.EMAIL_NOT_VERIFIED,
        'Please verify your email before logging in.',
      )
    }

    await userRepository.recordSuccessfulLogin(user.id, context.ip)
    const { tokens } = await issueAuthTokens(user, context)
    logger.info({ userId: user.id, sessionHint: tokens.accessToken.slice(0, 8) }, 'User logged in')
    await activityService.record({
      userId: user.id,
      actorId: user.id,
      kind: 'LOGIN',
      title: 'Signed in',
      ip: context.ip,
      userAgent: context.userAgent,
    })

    const isStaff =
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      Boolean(user.staffRole)
    if (isStaff) {
      await opsAlertService.notify({
        event: 'ADMIN_LOGIN',
        title: 'Admin login',
        action: 'Staff member signed in',
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        userEmail: user.email,
        ip: context.ip,
        adminPath: `/admin/users/${user.id}`,
        details: { Role: user.role, StaffRole: user.staffRole ?? '—' },
      })
    }

    return {
      user: toPublicUser(user),
      wallet: null,
      tokens,
    }
  },

  async refresh(rawRefreshToken: string | undefined, context: SessionContext): Promise<AuthTokens> {
    if (!rawRefreshToken) {
      throw unauthorized('Refresh token missing.')
    }

    const hash = tokenService.hashToken(rawRefreshToken)
    const existing = await sessionRepository.findByRefreshTokenHash(hash)
    if (!existing) {
      throw unauthorized('Invalid refresh token.')
    }

    if (existing.revokedAt) {
      await sessionRepository.revokeFamily(existing.familyId)
      logger.warn({ familyId: existing.familyId }, 'Refresh token reuse detected')
      throw unauthorized('Refresh token reuse detected. Please sign in again.')
    }

    if (existing.expiresAt <= new Date()) {
      await sessionRepository.revoke(existing.id)
      throw unauthorized('Refresh token expired.')
    }

    const user = await userRepository.findById(existing.userId)
    if (
      !user ||
      user.status === 'SUSPENDED' ||
      user.status === 'BLOCKED' ||
      user.status === 'CLOSED' ||
      user.status === 'ARCHIVED'
    ) {
      await sessionRepository.revoke(existing.id)
      throw unauthorized('Session is no longer valid.')
    }

    const nextRefresh = tokenService.createOpaqueRefreshToken()
    const refreshTokenMaxAgeMs = tokenService.refreshTokenTtlMs()
    const accessTokenMaxAgeMs = tokenService.accessTokenTtlMs()

    const rotated = await sessionRepository.create({
      user: { connect: { id: user.id } },
      refreshTokenHash: nextRefresh.hash,
      familyId: existing.familyId,
      userAgent: context.userAgent?.slice(0, 400) ?? existing.userAgent,
      ip: context.ip ?? existing.ip,
      expiresAt: new Date(Date.now() + refreshTokenMaxAgeMs),
    })

    await sessionRepository.update(existing.id, {
      revokedAt: new Date(),
      replacedById: rotated.id,
    })

    const accessToken = tokenService.signAccessToken({
      userId: user.id,
      role: user.role,
      staffRole: user.staffRole,
      sessionId: rotated.id,
    })

    logger.info({ userId: user.id, sessionId: rotated.id }, 'Session refreshed')

    return {
      accessToken,
      refreshToken: nextRefresh.raw,
      csrfToken: tokenService.createCsrfToken(),
      accessTokenMaxAgeMs,
      refreshTokenMaxAgeMs,
    }
  },

  async logout(sessionId: string | undefined): Promise<void> {
    if (!sessionId) {
      return
    }
    const session = await sessionRepository.findById(sessionId)
    if (session && !session.revokedAt) {
      await sessionRepository.revoke(session.id)
      logger.info({ sessionId }, 'Session revoked on logout')
      await activityService.record({
        userId: session.userId,
        actorId: session.userId,
        kind: 'LOGOUT',
        title: 'Signed out',
        ip: session.ip,
        userAgent: session.userAgent,
      })
    }
  },

  async me(userId: string): Promise<{ user: ReturnType<typeof toPublicUser>; wallet: null }> {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw unauthorized()
    }
    return { user: toPublicUser(user), wallet: null }
  },

  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    const tokenHash = tokenService.hashToken(input.token)
    const record = await verificationTokenRepository.findByHash(tokenHash)
    if (!record || record.type !== 'EMAIL_VERIFICATION') {
      logger.warn({ tokenPrefix: input.token.slice(0, 8) }, 'Verify email: invalid token')
      throw badRequest('This verification link is invalid.')
    }
    if (record.usedAt) {
      const user = await userRepository.findById(record.userId)
      if (user?.emailVerifiedAt) {
        logger.info({ userId: user.id }, 'Verify email: already verified (idempotent)')
        return
      }
      logger.warn({ userId: record.userId }, 'Verify email: token already used')
      throw badRequest('This verification link has already been used.')
    }
    if (record.expiresAt <= new Date()) {
      logger.warn(
        { userId: record.userId, expiresAt: record.expiresAt.toISOString() },
        'Verify email: token expired',
      )
      throw badRequest('This verification link has expired.')
    }

    const user = await userRepository.markEmailVerified(record.userId)
    await verificationTokenRepository.markUsed(record.id)
    await emailService
      .sendWelcomeEmail({ to: user.email, firstName: user.firstName })
      .catch((err) => {
        logger.warn({ err, userId: user.id }, 'Welcome email failed after verify')
      })
    logger.info(
      { userId: user.id, email: user.email, status: user.status },
      'Email verified',
    )
    await opsAlertService.notify({
      event: 'EMAIL_VERIFIED',
      title: 'Email verified',
      action: 'Investor verified their email address',
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`.trim(),
      userEmail: user.email,
      adminPath: `/admin/users/${user.id}`,
    })
    await activityService.record({
      userId: user.id,
      actorId: user.id,
      kind: 'PROFILE_UPDATE',
      title: 'Email verified',
      description: 'Investor confirmed their email address',
    })
  },

  async resendVerification(input: ResendVerificationInput): Promise<{ emailSent: boolean }> {
    const user = await userRepository.findByEmail(input.email)
    if (!user || user.emailVerifiedAt) {
      logger.info(
        { email: input.email, found: Boolean(user), alreadyVerified: Boolean(user?.emailVerifiedAt) },
        'Resend verification: no-op',
      )
      // Enumeration-safe success
      return { emailSent: true }
    }

    await assertVerificationResendAllowed(user.id)
    const token = await createVerificationToken(user.id)
    const emailSent = await trySendVerificationEmail({
      userId: user.id,
      to: user.email,
      firstName: user.firstName,
      token,
      reason: 'resend',
    })
    if (!emailSent) {
      throw new AppError(
        503,
        ERROR_CODES.INTERNAL_ERROR,
        'Could not send the verification email. Please try again shortly.',
      )
    }
    logger.info({ userId: user.id }, 'Verification email resent')
    return { emailSent: true }
  },

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const user = await userRepository.findByEmail(input.email)
    if (!user || !user.passwordHash) {
      return
    }
    const token = await createPasswordResetToken(user.id)
    await emailService.sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      token,
    })
    logger.info({ userId: user.id }, 'Password reset email sent')
  },

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = tokenService.hashToken(input.token)
    const record = await verificationTokenRepository.findByHash(tokenHash)
    if (!record || record.type !== 'PASSWORD_RESET' || record.usedAt || record.expiresAt <= new Date()) {
      throw badRequest('This password reset link is invalid or has expired.')
    }

    const passwordHash = await passwordService.hash(input.password)
    await userRepository.updatePassword(record.userId, passwordHash)
    await verificationTokenRepository.markUsed(record.id)
    await sessionRepository.revokeAllForUser(record.userId)
    logger.info({ userId: record.userId }, 'Password reset completed')
    await activityService.record({
      userId: record.userId,
      actorId: record.userId,
      kind: 'PASSWORD_CHANGE',
      title: 'Password reset completed',
    })
    await opsAlertService.notify({
      event: 'PASSWORD_RESET',
      title: 'Password reset',
      action: 'Investor completed a password reset',
      userId: record.userId,
      adminPath: `/admin/users/${record.userId}`,
    })
  },

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await userRepository.findById(userId)
    if (!user?.passwordHash) {
      throw badRequest('Password change is not available for this account.')
    }

    const valid = await passwordService.verify(input.currentPassword, user.passwordHash)
    if (!valid) {
      throw unauthorized('Current password is incorrect.')
    }

    if (input.currentPassword === input.newPassword) {
      throw badRequest('New password must be different from the current password.')
    }

    const passwordHash = await passwordService.hash(input.newPassword)
    await userRepository.updatePassword(user.id, passwordHash)
    await sessionRepository.revokeAllForUser(user.id)
    await emailService.sendSecurityAlertEmail({
      to: user.email,
      firstName: user.firstName,
      message: 'Your password was changed. All sessions have been signed out.',
    })
    logger.info({ userId: user.id }, 'Password changed')
    await activityService.record({
      userId: user.id,
      actorId: user.id,
      kind: 'PASSWORD_CHANGE',
      title: 'Password changed',
    })
  },

  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await sessionRepository.listActiveByUser(userId)
    return sessions.map((session) => {
      const parsed = parseUserAgent(session.userAgent)
      return {
        id: session.id,
        device: parsed.device,
        browser: parsed.browser,
        ip: session.ip ?? 'unknown',
        location: null,
        lastUsedAt: session.lastUsedAt.toISOString(),
        isCurrent: session.id === currentSessionId,
      }
    })
  },

  async revokeSession(userId: string, sessionId: string, currentSessionId: string): Promise<void> {
    const session = await sessionRepository.findById(sessionId)
    if (!session || session.userId !== userId) {
      throw badRequest('Session not found.')
    }
    if (session.id === currentSessionId) {
      throw badRequest('Use logout to end the current session.')
    }
    if (!session.revokedAt) {
      await sessionRepository.revoke(session.id)
    }
  },
}
