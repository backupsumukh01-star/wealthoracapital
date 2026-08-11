import { createHmac, randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

import { createApp } from '../../app.js'
import { env } from '../../config/env.js'
import { prisma } from '../../database/prisma.js'
import { moneyString } from '../../utils/money.js'
import { ledgerService } from '../finance/ledger.service.js'
import { referralService, privacySafeDisplayName } from '../finance/referral.service.js'
import { settingsService } from '../settings.service.js'

const app = createApp()

const originalFetch = globalThis.fetch
const originalGoogle = {
  id: env.GOOGLE_CLIENT_ID,
  secret: env.GOOGLE_CLIENT_SECRET,
  callback: env.GOOGLE_CALLBACK_URL,
}

function enableGoogleEnv() {
  ;(env as { GOOGLE_CLIENT_ID: string }).GOOGLE_CLIENT_ID = 'test-google-client-id'
  ;(env as { GOOGLE_CLIENT_SECRET: string }).GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
  ;(env as { GOOGLE_CALLBACK_URL: string }).GOOGLE_CALLBACK_URL =
    'http://localhost:4000/api/v1/auth/google/callback'
}

function decodeOAuthState(state: string): { rc?: string } {
  const [body] = state.split('.')
  expect(body).toBeTruthy()
  return JSON.parse(Buffer.from(body!, 'base64url').toString('utf8')) as { rc?: string }
}

async function ensureSystemAccounts() {
  for (const code of ['SYS:CLEARING', 'SYS:PAYOUT', 'SYS:FEES', 'SYS:SUSPENSE']) {
    await prisma.ledgerAccount.upsert({
      where: { code },
      create: { code, name: code, accountType: 'ASSET', isSystem: true },
      update: {},
    })
  }
}

async function createUser(opts?: {
  referredById?: string
  emailPrefix?: string
  firstName?: string
  lastName?: string
  passwordHash?: string
}) {
  const email = `${opts?.emailPrefix ?? 'net'}_${randomUUID().slice(0, 8)}@example.com`
  return prisma.user.create({
    data: {
      email,
      passwordHash: opts?.passwordHash ?? 'x',
      firstName: opts?.firstName ?? 'Net',
      lastName: opts?.lastName ?? 'User',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      kycStatus: 'APPROVED',
      referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
      ...(opts?.referredById ? { referredById: opts.referredById } : {}),
    },
  })
}

async function loginAgent(email: string, password: string) {
  const agent = request.agent(app)
  const login = await agent.post('/api/v1/auth/login').send({ email, password })
  expect(login.status).toBe(200)
  return agent
}

async function registerVerified(opts: {
  emailPrefix: string
  referralCode?: string
  firstName?: string
  lastName?: string
}) {
  const email = `${opts.emailPrefix}_${randomUUID().slice(0, 8)}@example.com`
  const password = 'SecurePass1!'
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email,
      password,
      firstName: opts.firstName ?? 'Ref',
      lastName: opts.lastName ?? 'User',
      ...(opts.referralCode ? { referralCode: opts.referralCode } : {}),
      acceptTerms: true,
      acceptRisk: true,
    })
  return { email, password, res }
}

describe('Phase 3M.1 referral registration UX + network', () => {
  beforeAll(async () => {
    await ensureSystemAccounts()
    const settings = await settingsService.getOrInitPlatformSettings()
    await prisma.platformSetting.update({
      where: { id: settings.id },
      data: {
        referralEnabled: false,
        referralPercent: '5',
        referralUnlockDays: 30,
      },
    })
  })

  afterAll(async () => {
    globalThis.fetch = originalFetch
    ;(env as { GOOGLE_CLIENT_ID: string }).GOOGLE_CLIENT_ID = originalGoogle.id
    ;(env as { GOOGLE_CLIENT_SECRET: string }).GOOGLE_CLIENT_SECRET = originalGoogle.secret
    ;(env as { GOOGLE_CALLBACK_URL: string }).GOOGLE_CALLBACK_URL = originalGoogle.callback
    vi.restoreAllMocks()

    const settings = await settingsService.getOrInitPlatformSettings()
    await prisma.platformSetting.update({
      where: { id: settings.id },
      data: { referralEnabled: false },
    })
  })

  it('1. normal registration with ?ref= / referralCode attaches referrer', async () => {
    const referrer = await createUser({ emailPrefix: 'a_ref', firstName: 'Alice' })
    const { email, res } = await registerVerified({
      emailPrefix: 'a_email',
      referralCode: referrer.referralCode!,
      firstName: 'Bob',
    })
    expect([200, 201]).toContain(res.status)
    const user = await prisma.user.findFirstOrThrow({ where: { email } })
    expect(user.referredById).toBe(referrer.id)
  })

  it('2. Google registration with ?ref= attaches referrer via signed state', async () => {
    enableGoogleEnv()
    const referrer = await createUser({ emailPrefix: 'g_ref', firstName: 'Gina' })
    const email = `g_new_${randomUUID().slice(0, 8)}@gmail.com`
    const googleSub = `g-sub-${randomUUID().slice(0, 8)}`

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
            family_name: 'Newbie',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return originalFetch(input)
    }) as typeof fetch

    const agent = request.agent(app)
    const start = await agent.get(
      `/api/v1/auth/google?ref=${encodeURIComponent(referrer.referralCode!)}`,
    )
    expect(start.status).toBe(302)
    const googleUrl = new URL(start.headers.location as string)
    const state = googleUrl.searchParams.get('state')
    expect(state).toBeTruthy()
    expect(decodeOAuthState(state!).rc).toBe(referrer.referralCode)

    const callback = await agent.get(
      `/api/v1/auth/google/callback?code=test-auth-code&state=${encodeURIComponent(state!)}`,
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.location).not.toMatch(/error=/)

    const user = await prisma.user.findFirstOrThrow({ where: { email } })
    expect(user.referredById).toBe(referrer.id)
    expect(user.googleId).toBe(googleSub)
    expect(
      await prisma.referralReward.count({
        where: { OR: [{ referrerId: referrer.id }, { refereeId: user.id }] },
      }),
    ).toBe(0)
  })

  it('3. Google registration without ?ref= works and leaves referredById null', async () => {
    enableGoogleEnv()
    const email = `g_noref_${randomUUID().slice(0, 8)}@gmail.com`
    const googleSub = `g-noref-${randomUUID().slice(0, 8)}`

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
            given_name: 'No',
            family_name: 'Ref',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return originalFetch(input)
    }) as typeof fetch

    const agent = request.agent(app)
    const start = await agent.get('/api/v1/auth/google')
    const state = new URL(start.headers.location as string).searchParams.get('state')
    expect(decodeOAuthState(state!).rc).toBeUndefined()

    const callback = await agent.get(
      `/api/v1/auth/google/callback?code=c&state=${encodeURIComponent(state!)}`,
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.location).not.toMatch(/error=/)
    const user = await prisma.user.findFirstOrThrow({ where: { email } })
    expect(user.referredById).toBeNull()
  })

  it('4. invalid referral code rejects email + Google start', async () => {
    const { email, res } = await registerVerified({
      emailPrefix: 'bad_code',
      referralCode: 'NOTEXIST9',
    })
    expect(res.status).toBe(400)
    expect(String(res.body.error?.message ?? '')).toMatch(/invalid referral code/i)
    expect(await prisma.user.findFirst({ where: { email } })).toBeNull()

    enableGoogleEnv()
    const start = await request(app).get('/api/v1/auth/google?ref=ZZZZNOPE1')
    expect(start.status).toBe(302)
    // Format may pass length check; invalid existence fails on callback. Short codes fail at start.
    const short = await request(app).get('/api/v1/auth/google?ref=AB')
    expect(short.status).toBe(302)
    expect(short.headers.location).toMatch(/error=invalid_referral/)
  })

  it('4b. Google callback with unknown referral code fails without creating user', async () => {
    enableGoogleEnv()
    const email = `g_badref_${randomUUID().slice(0, 8)}@gmail.com`
    const googleSub = `g-bad-${randomUUID().slice(0, 8)}`

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
            given_name: 'Bad',
            family_name: 'Ref',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return originalFetch(input)
    }) as typeof fetch

    const agent = request.agent(app)
    const start = await agent.get('/api/v1/auth/google?ref=NOTEXIST1')
    expect(start.status).toBe(302)
    const state = new URL(start.headers.location as string).searchParams.get('state')
    expect(decodeOAuthState(state!).rc).toBe('NOTEXIST1')

    const callback = await agent.get(
      `/api/v1/auth/google/callback?code=c&state=${encodeURIComponent(state!)}`,
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.location).toMatch(/error=invalid_referral/)
    expect(await prisma.user.findFirst({ where: { email } })).toBeNull()
  })

  it('5. existing Google login does not overwrite referredById', async () => {
    enableGoogleEnv()
    const originalReferrer = await createUser({ emailPrefix: 'keep_a' })
    const otherReferrer = await createUser({ emailPrefix: 'keep_b' })
    const email = `g_keep_${randomUUID().slice(0, 8)}@gmail.com`
    const googleSub = `g-keep-${randomUUID().slice(0, 8)}`

    const existing = await prisma.user.create({
      data: {
        email,
        googleId: googleSub,
        passwordHash: null,
        firstName: 'Keep',
        lastName: 'Ref',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
        referredById: originalReferrer.id,
      },
    })

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
            given_name: 'Keep',
            family_name: 'Ref',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return originalFetch(input)
    }) as typeof fetch

    const agent = request.agent(app)
    const start = await agent.get(
      `/api/v1/auth/google?ref=${encodeURIComponent(otherReferrer.referralCode!)}`,
    )
    const state = new URL(start.headers.location as string).searchParams.get('state')
    const callback = await agent.get(
      `/api/v1/auth/google/callback?code=c&state=${encodeURIComponent(state!)}`,
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.location).not.toMatch(/error=/)

    const after = await prisma.user.findUniqueOrThrow({ where: { id: existing.id } })
    expect(after.referredById).toBe(originalReferrer.id)
  })

  it('6–13. network: direct only, counts, earnings, privacy, no reward at registration', async () => {
    const password = 'SecurePass1!'
    const hash = await (await import('../password.service.js')).passwordService.hash(password)

    const referrer = await createUser({
      emailPrefix: 'net_a',
      firstName: 'Rahul',
      lastName: 'Shah',
      passwordHash: hash,
    })
    const funded = await createUser({
      emailPrefix: 'net_b',
      firstName: 'Priya',
      lastName: 'Nair',
      referredById: referrer.id,
    })
    const unfunded = await createUser({
      emailPrefix: 'net_c',
      firstName: '   ',
      lastName: '   ',
      referredById: referrer.id,
    })
    // Multi-level: funded refers grandchild — must NOT appear in referrer's network
    const grandchild = await createUser({
      emailPrefix: 'net_d',
      firstName: 'Grand',
      lastName: 'Child',
      referredById: funded.id,
    })

    await ledgerService.ensureWalletsForUser(referrer.id)
    await ledgerService.ensureWalletsForUser(funded.id)
    const wallet = await prisma.wallet.findFirstOrThrow({
      where: { userId: funded.id, kind: 'INVESTMENT' },
    })
    const method =
      (await prisma.paymentMethod.findFirst({ where: { isActive: true, deletedAt: null } })) ??
      (await prisma.paymentMethod.create({
        data: {
          name: `Net ${randomUUID().slice(0, 4)}`,
          type: 'BANK_TRANSFER',
          instructions: 't',
          minAmount: moneyString(1),
          feePct: moneyString(0),
          isActive: true,
        },
      }))

    const deposit = await prisma.deposit.create({
      data: {
        reference: `DEP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
        userId: funded.id,
        walletId: wallet.id,
        paymentMethodId: method.id,
        amount: moneyString(100),
        creditedAmount: moneyString(100),
        fee: moneyString(0),
        status: 'APPROVED',
        reviewedAt: new Date(),
        idempotencyKey: `net-dep-${randomUUID()}`,
      },
    })

    // Programme OFF → no reward from deposit path via createForApprovedDeposit
    await prisma.$transaction(async (tx) => {
      await referralService.createForApprovedDeposit(tx, deposit)
    })
    expect(await prisma.referralReward.count({ where: { referrerId: referrer.id } })).toBe(0)

    // Seed a ReferralReward directly to prove network reads existing records (engine source of truth)
    await prisma.referralReward.create({
      data: {
        referrerId: referrer.id,
        refereeId: funded.id,
        sourceDepositId: deposit.id,
        sourceAmount: moneyString(100),
        rewardAmount: moneyString(5),
        percentApplied: '5.0000',
        status: 'LOCKED',
        unlockAt: new Date(Date.now() + 86400000),
      },
    })

    // No reward at registration of unfunded
    expect(
      await prisma.referralReward.count({
        where: { refereeId: unfunded.id },
      }),
    ).toBe(0)

    const agent = await loginAgent(referrer.email, password)
    const network = await agent.get('/api/v1/referrals/network')
    expect(network.status).toBe(200)
    const data = network.body.data
    expect(data.totalReferrals).toBe(2)
    expect(data.activeReferrals).toBe(1)
    expect(data.totalEarnings).toBe('5.00')
    expect(data.lockedEarnings).toBe('5.00')
    expect(data.availableEarnings).toBe('0.00')
    expect(data.redeemedEarnings).toBe('0.00')
    expect(data.referrals).toHaveLength(2)

    const names = data.referrals.map((r: { displayName: string }) => r.displayName)
    expect(names).toContain('Priya Nair')
    expect(names).toContain('User') // empty name fallback
    expect(names.join(' ')).not.toMatch(/Grand/)

    const blob = JSON.stringify(data)
    expect(blob).not.toContain(referrer.id)
    expect(blob).not.toContain(funded.id)
    expect(blob).not.toContain(unfunded.id)
    expect(blob).not.toContain(grandchild.id)
    expect(blob).not.toContain(funded.email)
    expect(blob).not.toMatch(/@example\.com/)
    expect(blob.toLowerCase()).not.toContain('phone')
    expect(blob.toLowerCase()).not.toContain('kyc')
    expect(blob).not.toContain(deposit.id)

    const fundedRow = data.referrals.find(
      (r: { displayName: string }) => r.displayName === 'Priya Nair',
    )
    expect(fundedRow.status).toBe('ACTIVE')
    expect(fundedRow.approvedDepositAmount).toBe('100.00')
    expect(fundedRow.referralEarnings).toBe('5.00')

    // 8. other user cannot see this network
    const other = await createUser({
      emailPrefix: 'net_other',
      passwordHash: hash,
    })
    const otherAgent = await loginAgent(other.email, password)
    const otherNet = await otherAgent.get('/api/v1/referrals/network')
    expect(otherNet.status).toBe(200)
    expect(otherNet.body.data.totalReferrals).toBe(0)
    expect(otherNet.body.data.referrals).toEqual([])

    // Query param userId must be ignored (ownership from session)
    const spoof = await otherAgent.get(`/api/v1/referrals/network?userId=${referrer.id}`)
    expect(spoof.status).toBe(200)
    expect(spoof.body.data.totalReferrals).toBe(0)

    // 13. no multi-level reward for grandchild deposits when engine runs
    await ledgerService.ensureWalletsForUser(grandchild.id)
    const gWallet = await prisma.wallet.findFirstOrThrow({
      where: { userId: grandchild.id, kind: 'INVESTMENT' },
    })
    const gDep = await prisma.deposit.create({
      data: {
        reference: `DEP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
        userId: grandchild.id,
        walletId: gWallet.id,
        paymentMethodId: method.id,
        amount: moneyString(200),
        creditedAmount: moneyString(200),
        fee: moneyString(0),
        status: 'APPROVED',
        reviewedAt: new Date(),
        idempotencyKey: `net-gdep-${randomUUID()}`,
      },
    })
    const settings = await settingsService.getOrInitPlatformSettings()
    await prisma.platformSetting.update({
      where: { id: settings.id },
      data: { referralEnabled: true },
    })
    try {
      await prisma.$transaction(async (tx) => {
        await referralService.createForApprovedDeposit(tx, gDep)
      })
      // Reward goes to funded (direct referrer of grandchild), NOT to top referrer
      expect(
        await prisma.referralReward.count({
          where: { referrerId: referrer.id, refereeId: grandchild.id },
        }),
      ).toBe(0)
      expect(
        await prisma.referralReward.count({
          where: { referrerId: funded.id, refereeId: grandchild.id },
        }),
      ).toBe(1)
    } finally {
      await prisma.platformSetting.update({
        where: { id: settings.id },
        data: { referralEnabled: false },
      })
    }
  })

  it('14–15. privacySafeDisplayName never invents emails', () => {
    expect(privacySafeDisplayName('Rahul', 'Shah')).toBe('Rahul Shah')
    expect(privacySafeDisplayName('', '')).toBe('User')
    expect(privacySafeDisplayName(null, undefined)).toBe('User')
  })

  it('16–17. display currency is presentation-only; ledger amounts stay USD strings', async () => {
    const password = 'SecurePass1!'
    const hash = await (await import('../password.service.js')).passwordService.hash(password)
    const referrer = await createUser({ emailPrefix: 'fx_a', passwordHash: hash })
    const agent = await loginAgent(referrer.email, password)
    const network = await agent.get('/api/v1/referrals/network')
    expect(network.status).toBe(200)
    // API always returns USD money strings (2dp) — no currency field rewrite
    expect(network.body.data.totalEarnings).toMatch(/^\d+\.\d{2}$/)
    expect(network.body.data.lockedEarnings).toMatch(/^\d+\.\d{2}$/)

    const settings = await settingsService.getOrInitPlatformSettings()
    expect(settings.referralEnabled).toBe(false)
  })

  it('OAuth signed state embeds referral code and rejects unsigned tampering', async () => {
    enableGoogleEnv()
    const { googleOAuthService } = await import('../google-oauth.service.js')
    const { url } = googleOAuthService.createAuthorizationRedirect({
      referralCode: 'ABCD1234',
    })
    const state = new URL(url).searchParams.get('state')!
    const [body, sig] = state.split('.')
    const expected = createHmac('sha256', env.JWT_ACCESS_SECRET).update(body!).digest('base64url')
    expect(sig).toBe(expected)
    const payload = JSON.parse(Buffer.from(body!, 'base64url').toString('utf8')) as { rc?: string }
    expect(payload.rc).toBe('ABCD1234')

    // Tampered unsigned payload must fail verify
    const evilBody = Buffer.from(
      JSON.stringify({ n: 'x', r: `${env.APP_URL}/oauth/callback`, e: Date.now() + 60_000, rc: 'HACKED99' }),
      'utf8',
    ).toString('base64url')
    const evilState = `${evilBody}.fakesig`
    expect(() =>
      googleOAuthService.parseAndValidateState(evilState, 'x'),
    ).toThrow()
  })
})
