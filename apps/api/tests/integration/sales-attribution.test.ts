import { randomUUID } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { env } from '../../src/config/env.js'
import { prisma } from '../../src/database/prisma.js'
import { passwordService } from '../../src/services/password.service.js'
import { salesAttributionService } from '../../src/services/sales-attribution.service.js'

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

function uniqueEmail(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}@example.com`
}

function uniqueSalesCode() {
  return `S${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

async function createSalesman(input?: { status?: 'ACTIVE' | 'DISABLED'; code?: string }) {
  const password = 'SecureSales1!'
  const salesman = await prisma.salesman.create({
    data: {
      email: uniqueEmail('sm'),
      passwordHash: await passwordService.hash(password),
      name: 'Attribution Sales',
      code: input?.code ?? uniqueSalesCode(),
      status: input?.status ?? 'ACTIVE',
    },
  })
  return { salesman, password }
}

async function createInvestorReferrer() {
  return prisma.user.create({
    data: {
      email: uniqueEmail('invref'),
      passwordHash: 'x',
      firstName: 'Investor',
      lastName: 'Referrer',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
    },
  })
}

async function register(input: { email: string; referralCode?: string }) {
  return request(app).post('/api/v1/auth/register').send({
    email: input.email,
    password: 'SecurePass1!',
    firstName: 'New',
    lastName: 'Investor',
    ...(input.referralCode ? { referralCode: input.referralCode } : {}),
    acceptTerms: true,
    acceptRisk: true,
  })
}

function enableGoogleEnv() {
  ;(env as { GOOGLE_CLIENT_ID: string }).GOOGLE_CLIENT_ID = 'test-google-client-id'
  ;(env as { GOOGLE_CLIENT_SECRET: string }).GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
  ;(env as { GOOGLE_CALLBACK_URL: string }).GOOGLE_CALLBACK_URL =
    'http://localhost:4000/api/v1/auth/google/callback'
}

function mockGoogleProfile(email: string, googleSub: string) {
  globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
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
          given_name: 'Google',
          family_name: 'User',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return originalFetch(input)
  }) as typeof fetch
}

describe('Salesman attribution (first-touch, not investor referral)', () => {
  it('valid ACTIVE salesman code attributes a new investor without referredById or rewards', async () => {
    const a = await createSalesman()
    const b = await createSalesman()
    const email = uniqueEmail('attr')
    const res = await register({ email, referralCode: a.salesman.code.toLowerCase() })
    expect([200, 201]).toContain(res.status)

    const user = await prisma.user.findFirstOrThrow({ where: { email } })
    expect(user.referredById).toBeNull()

    const attribution = await prisma.salesAttribution.findUniqueOrThrow({
      where: { userId: user.id },
    })
    expect(attribution.salesmanId).toBe(a.salesman.id)
    expect(attribution.salesmanId).not.toBe(b.salesman.id)
    expect(attribution.source).toBe('SALESMAN_LINK')
    expect(attribution.attributedAt).toBeTruthy()

    expect(
      await prisma.referralReward.count({
        where: { OR: [{ referrerId: a.salesman.id }, { refereeId: user.id }] },
      }),
    ).toBe(0)
    expect(user.referralCode).not.toBe(a.salesman.code)
  })

  it('DISABLED salesman cannot receive new attribution', async () => {
    const { salesman } = await createSalesman({ status: 'DISABLED' })
    const email = uniqueEmail('dis')
    const res = await register({ email, referralCode: salesman.code })
    expect(res.status).toBe(400)
    expect(String(res.body.error?.message ?? '')).toMatch(/invalid referral code/i)
    expect(await prisma.user.findFirst({ where: { email } })).toBeNull()
    expect(await prisma.salesAttribution.count({ where: { salesmanId: salesman.id } })).toBe(0)
  })

  it('invalid salesman code preserves existing invalid referral behavior', async () => {
    const email = uniqueEmail('bad')
    const res = await register({ email, referralCode: 'SZZZZZZ1' })
    expect(res.status).toBe(400)
    expect(String(res.body.error?.message ?? '')).toMatch(/invalid referral code/i)
    expect(await prisma.user.findFirst({ where: { email } })).toBeNull()
  })

  it('existing investor referral code still sets referredById and does not create SalesAttribution', async () => {
    const referrer = await createInvestorReferrer()
    const email = uniqueEmail('iref')
    const res = await register({ email, referralCode: referrer.referralCode! })
    expect([200, 201]).toContain(res.status)
    const user = await prisma.user.findFirstOrThrow({ where: { email } })
    expect(user.referredById).toBe(referrer.id)
    expect(await prisma.salesAttribution.findUnique({ where: { userId: user.id } })).toBeNull()
    expect(
      await prisma.referralReward.count({
        where: { OR: [{ referrerId: referrer.id }, { refereeId: user.id }] },
      }),
    ).toBe(0)
  })

  it('investor referral code takes precedence over an identical salesman code', async () => {
    const code = uniqueSalesCode()
    const referrer = await prisma.user.create({
      data: {
        email: uniqueEmail('collide'),
        passwordHash: 'x',
        firstName: 'Code',
        lastName: 'Owner',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        referralCode: code,
      },
    })
    const { salesman } = await createSalesman({ code })
    const email = uniqueEmail('prec')
    const res = await register({ email, referralCode: code })
    expect([200, 201]).toContain(res.status)
    const user = await prisma.user.findFirstOrThrow({ where: { email } })
    expect(user.referredById).toBe(referrer.id)
    expect(await prisma.salesAttribution.findUnique({ where: { userId: user.id } })).toBeNull()
    expect(await prisma.salesAttribution.count({ where: { salesmanId: salesman.id } })).toBe(0)
  })

  it('registration without referral creates no SalesAttribution', async () => {
    const email = uniqueEmail('noref')
    const res = await register({ email })
    expect([200, 201]).toContain(res.status)
    const user = await prisma.user.findFirstOrThrow({ where: { email } })
    expect(user.referredById).toBeNull()
    expect(await prisma.salesAttribution.findUnique({ where: { userId: user.id } })).toBeNull()
  })

  it('first-touch lock ignores a second attribution attempt', async () => {
    const a = await createSalesman()
    const b = await createSalesman()
    const user = await prisma.user.create({
      data: {
        email: uniqueEmail('lock'),
        passwordHash: 'x',
        firstName: 'Lock',
        lastName: 'User',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
      },
    })
    await salesAttributionService.attributeNewInvestor(user.id, a.salesman.id)
    const first = await prisma.salesAttribution.findUniqueOrThrow({ where: { userId: user.id } })
    await salesAttributionService.attributeNewInvestor(user.id, b.salesman.id)
    const second = await prisma.salesAttribution.findUniqueOrThrow({ where: { userId: user.id } })
    expect(second.salesmanId).toBe(a.salesman.id)
    expect(second.source).toBe(first.source)
    expect(second.attributedAt.getTime()).toBe(first.attributedAt.getTime())
    expect(await prisma.salesAttribution.count({ where: { userId: user.id } })).toBe(1)
  })

  it('Google signup with investor referral preserves referredById and creates no SalesAttribution', async () => {
    enableGoogleEnv()
    const referrer = await createInvestorReferrer()
    const email = uniqueEmail('giref')
    const googleSub = `g-${randomUUID().slice(0, 8)}`
    mockGoogleProfile(email, googleSub)

    const agent = request.agent(app)
    const start = await agent.get(`/api/v1/auth/google?ref=${encodeURIComponent(referrer.referralCode!)}`)
    expect(start.status).toBe(302)
    const state = new URL(start.headers.location as string).searchParams.get('state')
    const callback = await agent.get(
      `/api/v1/auth/google/callback?code=test&state=${encodeURIComponent(state!)}`,
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.location).not.toMatch(/error=/)

    const user = await prisma.user.findFirstOrThrow({ where: { email } })
    expect(user.referredById).toBe(referrer.id)
    expect(await prisma.salesAttribution.findUnique({ where: { userId: user.id } })).toBeNull()
    expect(
      await prisma.referralReward.count({
        where: { OR: [{ referrerId: referrer.id }, { refereeId: user.id }] },
      }),
    ).toBe(0)
  })

  it('Google signup with salesman code creates SalesAttribution and leaves referredById null', async () => {
    enableGoogleEnv()
    const { salesman } = await createSalesman()
    const email = uniqueEmail('gsales')
    const googleSub = `g-${randomUUID().slice(0, 8)}`
    mockGoogleProfile(email, googleSub)

    const agent = request.agent(app)
    const start = await agent.get(`/api/v1/auth/google?ref=${encodeURIComponent(salesman.code)}`)
    expect(start.status).toBe(302)
    const state = new URL(start.headers.location as string).searchParams.get('state')
    const callback = await agent.get(
      `/api/v1/auth/google/callback?code=test&state=${encodeURIComponent(state!)}`,
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.location).not.toMatch(/error=/)

    const user = await prisma.user.findFirstOrThrow({ where: { email } })
    expect(user.referredById).toBeNull()
    const attribution = await prisma.salesAttribution.findUniqueOrThrow({ where: { userId: user.id } })
    expect(attribution.salesmanId).toBe(salesman.id)
    expect(attribution.source).toBe('SALESMAN_LINK')
    expect(
      await prisma.referralReward.count({
        where: { refereeId: user.id },
      }),
    ).toBe(0)
  })

  it('Google login of an existing user does not change SalesAttribution', async () => {
    enableGoogleEnv()
    const first = await createSalesman()
    const second = await createSalesman()
    const email = uniqueEmail('gexist')
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'x',
        firstName: 'Existing',
        lastName: 'Google',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        googleId: `g-exist-${randomUUID().slice(0, 8)}`,
        referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
      },
    })
    await salesAttributionService.attributeNewInvestor(user.id, first.salesman.id)

    mockGoogleProfile(email, user.googleId!)
    const agent = request.agent(app)
    const start = await agent.get(`/api/v1/auth/google?ref=${encodeURIComponent(second.salesman.code)}`)
    const state = new URL(start.headers.location as string).searchParams.get('state')
    const callback = await agent.get(
      `/api/v1/auth/google/callback?code=test&state=${encodeURIComponent(state!)}`,
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.location).not.toMatch(/error=/)

    const after = await prisma.salesAttribution.findUniqueOrThrow({ where: { userId: user.id } })
    expect(after.salesmanId).toBe(first.salesman.id)
    expect(await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).toMatchObject({
      referredById: null,
    })
  })

  it('Google tampered OAuth state is rejected', async () => {
    enableGoogleEnv()
    const { salesman } = await createSalesman()
    const agent = request.agent(app)
    const start = await agent.get(`/api/v1/auth/google?ref=${encodeURIComponent(salesman.code)}`)
    expect(start.status).toBe(302)
    const state = new URL(start.headers.location as string).searchParams.get('state')!
    const tampered = `${state.slice(0, -6)}AAAAAA`
    const callback = await agent.get(
      `/api/v1/auth/google/callback?code=test&state=${encodeURIComponent(tampered)}`,
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.location).toMatch(/error=invalid_state|error=oauth_failed/)
  })

  it('does not expose a public attribution reassignment endpoint', async () => {
    const res = await request(app).post('/api/v1/sales/attributions').send({
      userId: randomUUID(),
      salesmanId: randomUUID(),
    })
    expect([401, 404]).toContain(res.status)
  })
})
