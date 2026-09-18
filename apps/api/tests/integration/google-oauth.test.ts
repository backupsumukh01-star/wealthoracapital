import { randomUUID } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { COOKIE_NAMES } from '../../src/config/cookies.js'
import { env } from '../../src/config/env.js'

const app = createApp()

const originalFetch = globalThis.fetch
const originalGoogle = {
  id: env.GOOGLE_CLIENT_ID,
  secret: env.GOOGLE_CLIENT_SECRET,
  callback: env.GOOGLE_CALLBACK_URL,
}

afterEach(() => {
  globalThis.fetch = originalFetch
  ;(env as { GOOGLE_CLIENT_ID: string }).GOOGLE_CLIENT_ID = originalGoogle.id
  ;(env as { GOOGLE_CLIENT_SECRET: string }).GOOGLE_CLIENT_SECRET = originalGoogle.secret
  ;(env as { GOOGLE_CALLBACK_URL: string }).GOOGLE_CALLBACK_URL = originalGoogle.callback
  vi.restoreAllMocks()
})

function enableGoogleEnv() {
  ;(env as { GOOGLE_CLIENT_ID: string }).GOOGLE_CLIENT_ID = 'test-google-client-id'
  ;(env as { GOOGLE_CLIENT_SECRET: string }).GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
  ;(env as { GOOGLE_CALLBACK_URL: string }).GOOGLE_CALLBACK_URL =
    'http://localhost:4000/api/v1/auth/google/callback'
}

describe('Google OAuth', () => {
  it('redirects to frontend with not_configured when Google env is empty', async () => {
    ;(env as { GOOGLE_CLIENT_ID: string }).GOOGLE_CLIENT_ID = ''
    ;(env as { GOOGLE_CLIENT_SECRET: string }).GOOGLE_CLIENT_SECRET = ''
    ;(env as { GOOGLE_CALLBACK_URL: string }).GOOGLE_CALLBACK_URL = ''

    const res = await request(app).get('/api/v1/auth/google')
    expect(res.status).toBe(302)
    expect(res.headers.location).toMatch(/\/oauth\/callback\?error=not_configured/)
  })

  it('starts Google auth with state cookie and Google redirect', async () => {
    enableGoogleEnv()
    const redirect = `${env.APP_URL.replace(/\/$/, '')}/oauth/callback`
    const res = await request(app).get(
      `/api/v1/auth/google?redirect=${encodeURIComponent(redirect)}`,
    )
    expect(res.status).toBe(302)
    expect(res.headers.location).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/)
    expect(res.headers.location).toContain('client_id=test-google-client-id')
    expect(res.headers.location).toContain('state=')
    const setCookie = res.headers['set-cookie'] as string[] | undefined
    expect(setCookie?.some((c) => c.startsWith(`${COOKIE_NAMES.oauthState}=`))).toBe(true)
  })

  it('rejects callback with missing state', async () => {
    enableGoogleEnv()
    const res = await request(app).get('/api/v1/auth/google/callback?code=fake')
    expect(res.status).toBe(302)
    expect(res.headers.location).toMatch(/error=invalid_state|error=oauth_failed/)
  })

  it('completes OAuth → sets JWT cookies → me → refresh → logout', async () => {
    enableGoogleEnv()
    const email = `gqa_${randomUUID().slice(0, 8)}@gmail.com`
    const googleSub = `google-sub-${randomUUID().slice(0, 8)}`

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 'ya29.test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('openidconnect.googleapis.com/v1/userinfo')) {
        expect(init?.headers && (init.headers as Record<string, string>).Authorization).toContain(
          'ya29.test-token',
        )
        return new Response(
          JSON.stringify({
            sub: googleSub,
            email,
            email_verified: true,
            given_name: 'Google',
            family_name: 'Tester',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return originalFetch(input, init)
    }) as typeof fetch

    const agent = request.agent(app)
    const start = await agent.get('/api/v1/auth/google')
    expect(start.status).toBe(302)
    const googleUrl = new URL(start.headers.location as string)
    const state = googleUrl.searchParams.get('state')
    expect(state).toBeTruthy()

    const callback = await agent.get(
      `/api/v1/auth/google/callback?code=test-auth-code&state=${encodeURIComponent(state!)}`,
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.location).toMatch(/\/oauth\/callback/)
    expect(callback.headers.location).not.toMatch(/error=/)

    const setCookie = callback.headers['set-cookie'] as string[] | undefined
    const cookieBlob = (setCookie ?? []).join('\n')
    expect(cookieBlob).toMatch(/mfx_at=/)
    expect(cookieBlob).toMatch(/mfx_rt=/)
    expect(cookieBlob).toMatch(/mfx_csrf=/)

    const me = await agent.get('/api/v1/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.data.user.email.toLowerCase()).toBe(email.toLowerCase())

    const refresh = await agent.post('/api/v1/auth/refresh')
    expect(refresh.status).toBe(200)
    expect(refresh.body.data.csrfToken).toBeTruthy()

    const logout = await agent.post('/api/v1/auth/logout')
    expect(logout.status).toBe(200)

    const meAfter = await agent.get('/api/v1/auth/me')
    expect(meAfter.status).toBe(401)

    const { prisma } = await import('../../src/database/prisma.js')
    const user = await prisma.user.findFirst({ where: { email } })
    expect(user?.googleId).toBe(googleSub)
    expect(user?.passwordHash).toBeNull()
    expect(user?.emailVerifiedAt).toBeTruthy()
    expect(user?.kycStatus).toBe('NOT_STARTED')
  })

  it('links Google to an existing email/password account', async () => {
    enableGoogleEnv()
    const email = `link_${randomUUID().slice(0, 8)}@example.com`
    const password = 'SecurePass1!'
    await request(app).post('/api/v1/auth/register').send({
      email,
      password,
      firstName: 'Link',
      lastName: 'User',
      acceptTerms: true,
      acceptRisk: true,
    })
    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.updateMany({
      where: { email },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    })

    const googleSub = `link-sub-${randomUUID().slice(0, 8)}`
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 'tok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('userinfo')) {
        return new Response(
          JSON.stringify({
            sub: googleSub,
            email,
            email_verified: true,
            given_name: 'Link',
            family_name: 'User',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return originalFetch(input)
    }) as typeof fetch

    const agent = request.agent(app)
    const start = await agent.get('/api/v1/auth/google')
    const state = new URL(start.headers.location as string).searchParams.get('state')!
    const callback = await agent.get(
      `/api/v1/auth/google/callback?code=c&state=${encodeURIComponent(state)}`,
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.location).not.toMatch(/error=/)

    const user = await prisma.user.findFirst({ where: { email } })
    expect(user?.googleId).toBe(googleSub)
    expect(user?.passwordHash).toBeTruthy()

    const me = await agent.get('/api/v1/auth/me')
    expect(me.status).toBe(200)
  })

  it('login entry: Google start without promo has no signed referral; with promo signs rc', async () => {
    enableGoogleEnv()
    const { prisma } = await import('../../src/database/prisma.js')
    const referrerCode = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
    await prisma.user.create({
      data: {
        email: `ref_login_${randomUUID().slice(0, 8)}@example.com`,
        passwordHash: null,
        firstName: 'Ref',
        lastName: 'Login',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        referralCode: referrerCode,
      },
    })

    const loginRedirect = `${env.APP_URL.replace(/\/$/, '')}/oauth/callback?from=login`

    const noPromo = await request(app).get(
      `/api/v1/auth/google?redirect=${encodeURIComponent(loginRedirect)}`,
    )
    expect(noPromo.status).toBe(302)
    const noPromoState = new URL(noPromo.headers.location as string).searchParams.get('state')!
    const [noPromoBody] = noPromoState.split('.')
    const noPromoPayload = JSON.parse(Buffer.from(noPromoBody, 'base64url').toString('utf8')) as {
      rc?: string
      r?: string
    }
    expect(noPromoPayload.rc).toBeUndefined()
    expect(String(noPromoPayload.r)).toContain('from=login')

    const withPromo = await request(app).get(
      `/api/v1/auth/google?redirect=${encodeURIComponent(loginRedirect)}&ref=${encodeURIComponent(referrerCode)}`,
    )
    expect(withPromo.status).toBe(302)
    const withState = new URL(withPromo.headers.location as string).searchParams.get('state')!
    const [withBody] = withState.split('.')
    const withPayload = JSON.parse(Buffer.from(withBody, 'base64url').toString('utf8')) as {
      rc?: string
    }
    expect(withPayload.rc).toBe(referrerCode)
  })

  it('login entry: invalid short promo returns invalid_referral with next=login', async () => {
    enableGoogleEnv()
    const loginRedirect = `${env.APP_URL.replace(/\/$/, '')}/oauth/callback?from=login`
    const short = await request(app).get(
      `/api/v1/auth/google?redirect=${encodeURIComponent(loginRedirect)}&ref=AB`,
    )
    expect(short.status).toBe(302)
    expect(short.headers.location).toMatch(/error=invalid_referral/)
    expect(short.headers.location).toMatch(/next=login/)
  })

  it('login entry: unknown promo fails on callback without creating user; next=login', async () => {
    enableGoogleEnv()
    const email = `g_login_bad_${randomUUID().slice(0, 8)}@gmail.com`
    const googleSub = `g-login-bad-${randomUUID().slice(0, 8)}`

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 'tok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('userinfo')) {
        return new Response(
          JSON.stringify({
            sub: googleSub,
            email,
            email_verified: true,
            given_name: 'Bad',
            family_name: 'Promo',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return originalFetch(input)
    }) as typeof fetch

    const loginRedirect = `${env.APP_URL.replace(/\/$/, '')}/oauth/callback?from=login`
    const agent = request.agent(app)
    const start = await agent.get(
      `/api/v1/auth/google?redirect=${encodeURIComponent(loginRedirect)}&ref=NOTEXIST1`,
    )
    expect(start.status).toBe(302)
    const state = new URL(start.headers.location as string).searchParams.get('state')!
    const callback = await agent.get(
      `/api/v1/auth/google/callback?code=c&state=${encodeURIComponent(state)}`,
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.location).toMatch(/error=invalid_referral/)
    expect(callback.headers.location).toMatch(/next=login/)

    const { prisma } = await import('../../src/database/prisma.js')
    expect(await prisma.user.findFirst({ where: { email } })).toBeNull()
  })
})
