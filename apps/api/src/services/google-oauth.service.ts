import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'

import { ERROR_CODES } from '@meridian/shared'
import type { User } from '@prisma/client'

import { AUTH_LIMITS } from '../config/constants.js'
import { env, getCorsOrigins } from '../config/env.js'
import { emailService } from '../emails/email.service.js'
import { userRepository } from '../repositories/user.repository.js'
import type { AuthTokens, SessionContext } from '../types/auth.types.js'
import { generateReferralCode } from '../utils/crypto.js'
import { AppError, badRequest, forbidden, serviceUnavailable, unauthorized } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import { activityService } from './activity.service.js'
import { authService } from './auth.service.js'
import { opsAlertService } from './ops-alert.service.js'
import { salesAttributionService } from './sales-attribution.service.js'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const STATE_TTL_MS = 10 * 60_000

export type GoogleProfile = {
  sub: string
  email: string
  emailVerified: boolean
  givenName: string
  familyName: string
  picture?: string
}

type OAuthStatePayload = {
  n: string
  r: string
  e: number
  /** Optional referral code captured at OAuth start (HMAC-signed; never trust callback query alone). */
  rc?: string
}

function oauthConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL)
}

function googleEmailList(raw: string): Set<string> {
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

function resolveGoogleStaffRole(
  email: string,
): 'SUPER_ADMIN' | 'ADMIN' | null {
  const normalized = email.trim().toLowerCase()
  const superAdmins = googleEmailList(env.GOOGLE_SUPER_ADMIN_EMAILS)
  const admins = googleEmailList(env.GOOGLE_ADMIN_EMAILS)

  if (superAdmins.has(normalized)) return 'SUPER_ADMIN'
  if (admins.has(normalized)) return 'ADMIN'
  return null
}

async function applyGoogleStaffAllowlist(
  user: User,
  options: { adminIntent: boolean },
): Promise<User> {
  const staffRole = resolveGoogleStaffRole(user.email)

  if (options.adminIntent && !staffRole) {
    throw forbidden('This Google account is not allowed to access the admin console.')
  }

  if (!staffRole) return user

  if (user.role === staffRole && user.staffRole === staffRole && user.status === 'ACTIVE') {
    return user
  }

  return userRepository.update(user.id, {
    role: staffRole,
    staffRole,
    status: 'ACTIVE',
    emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
  })
}

function assertOAuthConfigured(): void {
  if (!oauthConfigured()) {
    throw serviceUnavailable('Google sign-in is not configured.')
  }
}

function signState(payload: OAuthStatePayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', env.JWT_ACCESS_SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}

function verifyState(raw: string): OAuthStatePayload {
  const [body, sig] = raw.split('.')
  if (!body || !sig) throw unauthorized('Invalid OAuth state.')
  const expected = createHmac('sha256', env.JWT_ACCESS_SECRET).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw unauthorized('Invalid OAuth state.')
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthStatePayload
  if (!payload?.n || !payload?.r || !payload?.e) throw unauthorized('Invalid OAuth state.')
  if (Date.now() > payload.e) throw unauthorized('OAuth state expired. Try again.')
  return payload
}

/** Only allow post-login redirects back to our web origins (APP_URL + CORS list). */
export function sanitizeOAuthRedirect(candidate: string | undefined): string {
  const fallback = `${env.APP_URL.replace(/\/$/, '')}/oauth/callback`
  if (!candidate) return fallback
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return fallback
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return fallback
  const allowed = new Set(
    [env.APP_URL, ...getCorsOrigins()]
      .map((o) => {
        try {
          return new URL(o).origin
        } catch {
          return null
        }
      })
      .filter(Boolean) as string[],
  )
  if (!allowed.has(url.origin)) return fallback
  if (url.pathname !== '/oauth/callback') return fallback
  return url.toString()
}

function defaultCallbackUrl(): string {
  if (env.GOOGLE_CALLBACK_URL) return env.GOOGLE_CALLBACK_URL
  return `${env.API_URL.replace(/\/$/, '')}/api/v1/auth/google/callback`
}

async function allocateReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateReferralCode(AUTH_LIMITS.referralCodeLength)
    const existing = await userRepository.findByReferralCode(code)
    if (!existing) return code
  }
  return generateReferralCode(AUTH_LIMITS.referralCodeLength) + randomUUID().slice(0, 4)
}

function splitName(given?: string | null, family?: string | null, email?: string) {
  const firstName = (given?.trim() || email?.split('@')[0] || 'Investor').slice(0, 60)
  const lastName = (family?.trim() || 'User').slice(0, 60)
  return { firstName, lastName }
}

function normalizeOAuthReferralCode(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const code = raw.trim().toUpperCase()
  if (!code) return undefined
  if (code.length < 2 || code.length > 16) {
    throw badRequest('Invalid referral code.')
  }
  return code
}

export const googleOAuthService = {
  isConfigured: oauthConfigured,

  createAuthorizationRedirect(input: {
    redirect?: string
    referralCode?: string
  }): { url: string; stateCookie: string; stateCookieMaxAgeMs: number } {
    assertOAuthConfigured()
    const nonce = randomBytes(24).toString('base64url')
    const redirect = sanitizeOAuthRedirect(input.redirect)
    const rc = normalizeOAuthReferralCode(input.referralCode)
    const state = signState({
      n: nonce,
      r: redirect,
      e: Date.now() + STATE_TTL_MS,
      ...(rc ? { rc } : {}),
    })
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: defaultCallbackUrl(),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
      include_granted_scopes: 'true',
    })
    return {
      url: `${GOOGLE_AUTH_URL}?${params.toString()}`,
      stateCookie: nonce,
      stateCookieMaxAgeMs: STATE_TTL_MS,
    }
  },

  async exchangeCode(code: string): Promise<{ accessToken: string }> {
    assertOAuthConfigured()
    const body = new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: defaultCallbackUrl(),
      grant_type: 'authorization_code',
    })
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const json = (await res.json().catch(() => null)) as {
      access_token?: string
      error?: string
      error_description?: string
    } | null
    if (!res.ok || !json?.access_token) {
      logger.warn({ status: res.status, error: json?.error }, 'Google token exchange failed')
      throw badRequest(json?.error_description || 'Google authorization failed.')
    }
    return { accessToken: json.access_token }
  },

  async fetchProfile(accessToken: string): Promise<GoogleProfile> {
    const res = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const json = (await res.json().catch(() => null)) as {
      sub?: string
      email?: string
      email_verified?: boolean
      given_name?: string
      family_name?: string
      picture?: string
      error?: string
    } | null
    if (!res.ok || !json?.sub || !json.email) {
      logger.warn({ status: res.status, error: json?.error }, 'Google userinfo failed')
      throw badRequest('Could not load Google profile.')
    }
    return {
      sub: json.sub,
      email: json.email.toLowerCase(),
      emailVerified: Boolean(json.email_verified),
      givenName: json.given_name ?? '',
      familyName: json.family_name ?? '',
      picture: json.picture,
    }
  },

  parseAndValidateState(
    state: string | undefined,
    nonceCookie: string | undefined,
  ): { redirect: string; referralCode?: string } {
    if (!state || !nonceCookie) throw unauthorized('Missing OAuth state.')
    const payload = verifyState(state)
    const a = Buffer.from(payload.n)
    const b = Buffer.from(nonceCookie)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw unauthorized('OAuth state mismatch.')
    }
    return {
      redirect: sanitizeOAuthRedirect(payload.r),
      referralCode: typeof payload.rc === 'string' ? payload.rc : undefined,
    }
  },

  async upsertUserFromGoogle(
    profile: GoogleProfile,
    options: { referralCode?: string } = {},
  ): Promise<User> {
    if (!profile.emailVerified) {
      throw forbidden('Google account email is not verified.')
    }

    const byGoogle = await userRepository.findByGoogleId(profile.sub)
    if (byGoogle) {
      if (byGoogle.status === 'SUSPENDED' || byGoogle.status === 'BLOCKED') {
        throw new AppError(403, ERROR_CODES.ACCOUNT_SUSPENDED, 'This account has been suspended.')
      }
      if (byGoogle.status === 'CLOSED' || byGoogle.status === 'ARCHIVED') {
        throw unauthorized('This account is no longer available.')
      }
      return byGoogle
    }

    const byEmail = await userRepository.findByEmail(profile.email)
    if (byEmail) {
      if (byEmail.status === 'SUSPENDED' || byEmail.status === 'BLOCKED') {
        throw new AppError(403, ERROR_CODES.ACCOUNT_SUSPENDED, 'This account has been suspended.')
      }
      if (byEmail.status === 'CLOSED' || byEmail.status === 'ARCHIVED') {
        throw unauthorized('This account is no longer available.')
      }
      if (byEmail.googleId && byEmail.googleId !== profile.sub) {
        throw forbidden('This email is linked to a different Google account.')
      }
      return userRepository.update(byEmail.id, {
        googleId: profile.sub,
        emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
        status: byEmail.status === 'PENDING_VERIFICATION' ? 'ACTIVE' : byEmail.status,
      })
    }

    const incomingReferral = normalizeOAuthReferralCode(options.referralCode)
    const resolved = await salesAttributionService.resolveRegistrationCode(incomingReferral)
    const referredById = resolved.kind === 'investor' ? resolved.referrerId : null
    const salesmanId = resolved.kind === 'salesman' ? resolved.salesmanId : null

    const { firstName, lastName } = splitName(profile.givenName, profile.familyName, profile.email)
    const referralCode = await allocateReferralCode()
    const now = new Date()
    const user = await userRepository.create({
      email: profile.email,
      googleId: profile.sub,
      passwordHash: null,
      firstName,
      lastName,
      role: 'USER',
      status: 'ACTIVE',
      kycStatus: 'NOT_STARTED',
      emailVerifiedAt: now,
      referralCode,
      ...(referredById ? { referredBy: { connect: { id: referredById } } } : {}),
      termsAcceptedAt: now,
      riskAcceptedAt: now,
    })

    if (salesmanId) {
      await salesAttributionService.attributeNewInvestor(user.id, salesmanId)
    }

    await emailService.sendWelcomeEmail({
      to: user.email,
      firstName: user.firstName,
    })

    await activityService.record({
      userId: user.id,
      actorId: user.id,
      kind: 'REGISTRATION',
      title: 'Account created via Google',
    })

    await opsAlertService.notify({
      event: 'USER_REGISTERED',
      title: 'User registered (Google)',
      action: 'New investor account created via Google OAuth',
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`.trim(),
      userEmail: user.email,
      adminPath: `/admin/users/${user.id}`,
    })

    logger.info({ userId: user.id }, 'User registered via Google OAuth')
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
    return user
  },

  async completeLogin(
    profile: GoogleProfile,
    context: SessionContext,
    options: { adminIntent?: boolean; referralCode?: string } = {},
  ): Promise<{ user: User; tokens: AuthTokens }> {
    let user = await this.upsertUserFromGoogle(profile, { referralCode: options.referralCode })
    user = await applyGoogleStaffAllowlist(user, {
      adminIntent: Boolean(options.adminIntent),
    })
    await userRepository.recordSuccessfulLogin(user.id, context.ip)
    const { tokens } = await authService.issueTokensForUser(user, context)
    await activityService.record({
      userId: user.id,
      actorId: user.id,
      kind: 'LOGIN',
      title: 'Signed in with Google',
      ip: context.ip,
      userAgent: context.userAgent,
    })
    const isStaff =
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      Boolean(user.staffRole)
    await opsAlertService.notify({
      event: isStaff ? 'ADMIN_LOGIN' : 'GOOGLE_LOGIN',
      title: isStaff ? 'Admin Google login' : 'Google login',
      action: isStaff ? 'Staff signed in with Google' : 'Investor signed in with Google',
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`.trim(),
      userEmail: user.email,
      ip: context.ip,
      adminPath: `/admin/users/${user.id}`,
    })
    logger.info({ userId: user.id }, 'User logged in via Google OAuth')
    return { user, tokens }
  },
}
