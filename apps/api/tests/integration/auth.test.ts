import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'

const app = createApp()

function uniqueEmail() {
  return `qa_${randomUUID().slice(0, 8)}@example.com`
}

describe('Auth flows', () => {
  it('rejects weak passwords on register', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: uniqueEmail(),
      password: 'weak',
      firstName: 'Qa',
      lastName: 'User',
    })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('register → login → me → logout', async () => {
    const email = uniqueEmail()
    const password = 'SecurePass1!'

    const reg = await request(app).post('/api/v1/auth/register').send({
      email,
      password,
      firstName: 'Qa',
      lastName: 'Investor',
      acceptTerms: true,
      acceptRisk: true,
    })
    expect([200, 201]).toContain(reg.status)
    expect(reg.body.success).toBe(true)
    expect(reg.body.data.userId).toBeTruthy()

    // Activate for login if pending verification blocks login — force via prisma when needed
    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.updateMany({
      where: { email },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    })

    const agent = request.agent(app)
    const login = await agent.post('/api/v1/auth/login').send({ email, password })
    expect(login.status).toBe(200)
    expect(login.body.data.user.email.toLowerCase()).toBe(email.toLowerCase())
    expect(login.body.data.csrfToken).toMatch(/^[A-Za-z0-9_-]+$/)

    const setCookie = login.headers['set-cookie']
    expect(Array.isArray(setCookie)).toBe(true)
    const cookieHeader = (setCookie ?? []).join('\n')
    expect(cookieHeader).toMatch(/mfx_at=/)
    expect(cookieHeader).toMatch(/mfx_rt=/)
    expect(cookieHeader).toMatch(/mfx_csrf=/)
    // CSRF cookie must be JS-readable and Lax so Swagger XHR login can store/read it.
    const csrfLine = (setCookie ?? []).find((c) => c.startsWith('mfx_csrf='))
    expect(csrfLine).toBeTruthy()
    expect(csrfLine!.toLowerCase()).toMatch(/samesite=lax/)
    expect(csrfLine!.toLowerCase()).not.toMatch(/httponly/)

    const me = await agent.get('/api/v1/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.data.user.id).toBeTruthy()

    const logout = await agent.post('/api/v1/auth/logout')
    expect(logout.status).toBe(200)

    const meAfter = await agent.get('/api/v1/auth/me')
    expect(meAfter.status).toBe(401)
  })

  it('login fails with wrong password', async () => {
    const email = uniqueEmail()
    const password = 'SecurePass1!'
    await request(app).post('/api/v1/auth/register').send({
      email,
      password,
      firstName: 'Qa',
      lastName: 'User',
      acceptTerms: true,
      acceptRisk: true,
    })
    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.updateMany({
      where: { email },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    })

    const res = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'WrongPass1!',
    })
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('register creates user + token; unverified login returns EMAIL_NOT_VERIFIED', async () => {
    const email = uniqueEmail()
    const password = 'SecurePass1!'

    const reg = await request(app).post('/api/v1/auth/register').send({
      email,
      password,
      firstName: 'Qa',
      lastName: 'Verify',
      acceptTerms: true,
      acceptRisk: true,
    })
    expect(reg.status).toBe(201)
    expect(reg.body.data.userId).toBeTruthy()
    expect(typeof reg.body.data.emailSent).toBe('boolean')

    const { prisma } = await import('../../src/database/prisma.js')
    const user = await prisma.user.findFirst({ where: { email } })
    expect(user).toBeTruthy()
    expect(user!.passwordHash).toMatch(/^\$2[aby]\$/)
    expect(user!.status).toBe('PENDING_VERIFICATION')
    expect(user!.emailVerifiedAt).toBeNull()
    expect(user!.kycStatus).toBe('NOT_STARTED')

    const tokens = await prisma.verificationToken.findMany({
      where: { userId: user!.id, type: 'EMAIL_VERIFICATION' },
    })
    expect(tokens.length).toBeGreaterThanOrEqual(1)
    expect(tokens.some((t) => t.expiresAt > new Date() && !t.usedAt)).toBe(true)

    const login = await request(app).post('/api/v1/auth/login').send({ email, password })
    expect(login.status).toBe(403)
    expect(login.body.error.code).toBe('EMAIL_NOT_VERIFIED')
    expect(login.body.error.message).toBe('Please verify your email before logging in.')
  })

  it('verify email then login succeeds', async () => {
    const email = uniqueEmail()
    const password = 'SecurePass1!'

    await request(app).post('/api/v1/auth/register').send({
      email,
      password,
      firstName: 'Qa',
      lastName: 'Flow',
      acceptTerms: true,
      acceptRisk: true,
    })

    const { prisma } = await import('../../src/database/prisma.js')
    const { tokenService } = await import('../../src/services/token.service.js')
    const user = await prisma.user.findFirstOrThrow({ where: { email } })

    const raw = tokenService.createOpaqueRefreshToken().raw
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenService.hashToken(raw),
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    })

    const verify = await request(app).post('/api/v1/auth/verify-email').send({ token: raw })
    expect(verify.status).toBe(200)

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(refreshed.emailVerifiedAt).toBeTruthy()
    expect(refreshed.status).toBe('ACTIVE')
    expect(refreshed.kycStatus).toBe('NOT_STARTED')

    const login = await request(app).post('/api/v1/auth/login').send({ email, password })
    expect(login.status).toBe(200)
    expect(login.body.data.user.email.toLowerCase()).toBe(email)
    expect(login.body.data.user.kycStatus).toBe('NOT_STARTED')

    const wallet = await request.agent(app)
    await wallet.post('/api/v1/auth/login').send({ email, password })
    const deposit = await wallet.post('/api/v1/deposits').send({
      amount: '100.00',
      methodId: randomUUID(),
      idempotencyKey: `kyc-${randomUUID()}`,
    })
    expect(deposit.status).toBe(403)
    expect(String(deposit.body.error?.message ?? '')).toMatch(/KYC/i)
  })

  it('resend verification is rate-limited per account cooldown', async () => {
    const email = uniqueEmail()
    await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'SecurePass1!',
      firstName: 'Qa',
      lastName: 'Resend',
      acceptTerms: true,
      acceptRisk: true,
    })

    const first = await request(app).post('/api/v1/auth/verify-email/resend').send({ email })
    // Cooldown after register token — expect 429, or 200 if clock skew / first send path
    expect([200, 429]).toContain(first.status)
    if (first.status === 200) {
      const second = await request(app).post('/api/v1/auth/verify-email/resend').send({ email })
      expect(second.status).toBe(429)
      expect(second.body.error.code).toBe('RATE_LIMITED')
    } else {
      expect(first.body.error.code).toBe('RATE_LIMITED')
    }
  })

  it('unverified re-register updates password so login reaches verify gate', async () => {
    const email = uniqueEmail()
    await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'OldPassword1!',
      firstName: 'Qa',
      lastName: 'Retry',
      acceptTerms: true,
      acceptRisk: true,
    })

    const again = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'NewPassword1!',
      firstName: 'Qa',
      lastName: 'Retry',
      acceptTerms: true,
      acceptRisk: true,
    })
    expect(again.status).toBe(201)

    const loginOld = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'OldPassword1!' })
    expect(loginOld.status).toBe(401)

    const loginNew = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'NewPassword1!' })
    expect(loginNew.status).toBe(403)
    expect(loginNew.body.error.code).toBe('EMAIL_NOT_VERIFIED')
  })

  it('forgot password issues a reset token for Google-only accounts with no password', async () => {
    const email = uniqueEmail()
    const { prisma } = await import('../../src/database/prisma.js')
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: null,
        firstName: 'Google',
        lastName: 'Only',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
      },
    })

    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email })
    expect(res.status).toBe(200)

    const tokens = await prisma.verificationToken.findMany({
      where: { userId: user.id, type: 'PASSWORD_RESET' },
    })
    expect(tokens.some((t) => t.expiresAt > new Date() && !t.usedAt)).toBe(true)
  })

  it('password reset sets a password on Google-only accounts and allows login', async () => {
    const email = uniqueEmail()
    const newPassword = 'GooglePass1!'
    const { prisma } = await import('../../src/database/prisma.js')
    const { tokenService } = await import('../../src/services/token.service.js')
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: null,
        firstName: 'Google',
        lastName: 'SetPwd',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
      },
    })

    const raw = tokenService.createOpaqueRefreshToken().raw
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenService.hashToken(raw),
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    })

    const reset = await request(app).post('/api/v1/auth/reset-password').send({
      token: raw,
      password: newPassword,
    })
    expect(reset.status).toBe(200)

    const login = await request(app).post('/api/v1/auth/login').send({
      email,
      password: newPassword,
    })
    expect(login.status).toBe(200)
    expect(login.body.data.user.email.toLowerCase()).toBe(email)
  })

  it('password reset verifies pending accounts so they can log in', async () => {
    const email = uniqueEmail()
    const password = 'SecurePass1!'
    const newPassword = 'ResetPass1!'

    await request(app).post('/api/v1/auth/register').send({
      email,
      password,
      firstName: 'Qa',
      lastName: 'Reset',
      acceptTerms: true,
      acceptRisk: true,
    })

    const { prisma } = await import('../../src/database/prisma.js')
    const { tokenService } = await import('../../src/services/token.service.js')
    const user = await prisma.user.findFirstOrThrow({ where: { email } })

    const raw = tokenService.createOpaqueRefreshToken().raw
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenService.hashToken(raw),
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    })

    const reset = await request(app).post('/api/v1/auth/reset-password').send({
      token: raw,
      password: newPassword,
    })
    expect(reset.status).toBe(200)

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(refreshed.emailVerifiedAt).toBeTruthy()
    expect(refreshed.status).toBe('ACTIVE')

    const login = await request(app).post('/api/v1/auth/login').send({
      email,
      password: newPassword,
    })
    expect(login.status).toBe(200)
  })

  it('registering an existing Google account sends a set-password email instead of a dead end', async () => {
    const email = uniqueEmail()
    const { prisma } = await import('../../src/database/prisma.js')
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: null,
        firstName: 'Google',
        lastName: 'Register',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
      },
    })

    const res = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'NewPassword1!',
      firstName: 'Google',
      lastName: 'Register',
      acceptTerms: true,
      acceptRisk: true,
    })
    expect([200, 201]).toContain(res.status)
    expect(res.body.success).toBe(true)

    const tokens = await prisma.verificationToken.findMany({
      where: { userId: user.id, type: 'PASSWORD_RESET' },
    })
    expect(tokens.some((t) => t.expiresAt > new Date() && !t.usedAt)).toBe(true)
  })

  it('protected routes reject missing auth cookie', async () => {
    const res = await request(app).get('/api/v1/wallet')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toMatch(/UNAUTHENTICATED|TOKEN/)
  })

  it('refresh without cookie fails', async () => {
    const res = await request(app).post('/api/v1/auth/refresh')
    expect([401, 400]).toContain(res.status)
  })
})
