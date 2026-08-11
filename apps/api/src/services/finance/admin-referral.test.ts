import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../app.js'
import { hasPermission } from '../../config/permissions.js'
import { prisma } from '../../database/prisma.js'
import { d, moneyString } from '../../utils/money.js'
import { ledgerService } from '../finance/ledger.service.js'
import { referralService } from '../finance/referral.service.js'
import { settingsService } from '../settings.service.js'

const app = createApp()

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
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  staffRole?: 'SUPER_ADMIN' | 'ADMIN' | 'FINANCE' | 'SUPPORT' | 'VIEWER' | null
  passwordHash?: string
}) {
  const email = `${opts?.emailPrefix ?? 'admref'}_${randomUUID().slice(0, 8)}@example.com`
  return prisma.user.create({
    data: {
      email,
      passwordHash: opts?.passwordHash ?? 'x',
      firstName: opts?.firstName ?? 'Admin',
      lastName: opts?.lastName ?? 'Ref',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      kycStatus: 'APPROVED',
      role: opts?.role ?? 'USER',
      staffRole: opts?.staffRole ?? null,
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

async function registerAndPromote(opts: {
  emailPrefix: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER'
  staffRole?: 'SUPER_ADMIN' | 'ADMIN' | 'FINANCE' | 'SUPPORT' | 'VIEWER' | null
}) {
  const email = `${opts.emailPrefix}_${randomUUID().slice(0, 8)}@example.com`
  const password = 'SecurePass1!'
  await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    firstName: 'Ops',
    lastName: 'User',
    acceptTerms: true,
    acceptRisk: true,
  })
  const user = await prisma.user.findFirstOrThrow({ where: { email } })
  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      kycStatus: 'APPROVED',
      role: opts.role,
      staffRole: opts.staffRole ?? null,
    },
  })
  return { email, password, userId: user.id }
}

describe('Phase 3E admin referral management', () => {
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
    const settings = await prisma.platformSetting.findFirst()
    if (settings) {
      await prisma.platformSetting.update({
        where: { id: settings.id },
        data: {
          referralEnabled: false,
          referralPercent: '5',
          referralUnlockDays: 30,
        },
      })
    }
  })

  it('1. Admin can read referral settings', async () => {
    const admin = await registerAndPromote({
      emailPrefix: 'adm_set_r',
      role: 'SUPER_ADMIN',
      staffRole: 'SUPER_ADMIN',
    })
    const agent = await loginAgent(admin.email, admin.password)
    const res = await agent.get('/api/v1/admin/settings')
    expect(res.status).toBe(200)
    expect(res.body.data.referral).toEqual(
      expect.objectContaining({
        enabled: false,
        percent: expect.any(String),
        unlockDays: expect.any(Number),
      }),
    )
    expect(res.body.data.referral.enabled).toBe(false)
  })

  it('2+3. Authorized Admin can update referral percentage and lock days', async () => {
    const admin = await registerAndPromote({
      emailPrefix: 'adm_set_u',
      role: 'SUPER_ADMIN',
      staffRole: 'SUPER_ADMIN',
    })
    const agent = await loginAgent(admin.email, admin.password)

    const percentRes = await agent.put('/api/v1/admin/settings').send({
      referralPercent: '7.5',
    })
    expect(percentRes.status).toBe(200)
    expect(percentRes.body.data.referral.percent).toBe('7.5000')
    expect(percentRes.body.data.referral.enabled).toBe(false)

    const daysRes = await agent.put('/api/v1/admin/settings').send({
      referralUnlockDays: 14,
    })
    expect(daysRes.status).toBe(200)
    expect(daysRes.body.data.referral.unlockDays).toBe(14)
    expect(daysRes.body.data.referral.enabled).toBe(false)

    // restore defaults for later assertions
    await agent.put('/api/v1/admin/settings').send({
      referralPercent: '5',
      referralUnlockDays: 30,
      referralEnabled: false,
    })
  })

  it('4. Unauthorized / scoped staff cannot update settings', async () => {
    const finance = await registerAndPromote({
      emailPrefix: 'fin_set',
      role: 'ADMIN',
      staffRole: 'FINANCE',
    })
    expect(hasPermission({ role: 'ADMIN', staffRole: 'FINANCE' }, 'settings.manage')).toBe(false)

    const agent = await loginAgent(finance.email, finance.password)
    const res = await agent.put('/api/v1/admin/settings').send({
      referralPercent: '9',
    })
    expect(res.status).toBe(403)
  })

  it('5. Investor cannot access Admin referral endpoints', async () => {
    const investor = await registerAndPromote({
      emailPrefix: 'inv_ref',
      role: 'USER',
      staffRole: null,
    })
    expect(hasPermission({ role: 'USER', staffRole: null }, 'finance.view')).toBe(false)
    expect(hasPermission({ role: 'USER', staffRole: null }, 'settings.manage')).toBe(false)

    const agent = await loginAgent(investor.email, investor.password)
    const summary = await agent.get('/api/v1/admin/referrals/summary')
    expect([401, 403]).toContain(summary.status)
    const rewards = await agent.get('/api/v1/admin/referrals/rewards')
    expect([401, 403]).toContain(rewards.status)
    const relationships = await agent.get('/api/v1/admin/referrals/relationships')
    expect([401, 403]).toContain(relationships.status)
    const settings = await agent.get('/api/v1/admin/settings')
    expect([401, 403]).toContain(settings.status)
  })

  it('6+7. Changing percent/lock days does not rewrite existing reward snapshots', async () => {
    const settings = await settingsService.getOrInitPlatformSettings()
    await prisma.platformSetting.update({
      where: { id: settings.id },
      data: { referralEnabled: true, referralPercent: '5', referralUnlockDays: 30 },
    })

    const referrer = await createUser({ emailPrefix: 'snap_r', firstName: 'Snap', lastName: 'Referrer' })
    const referee = await createUser({
      emailPrefix: 'snap_e',
      firstName: 'Snap',
      lastName: 'Referee',
      referredById: referrer.id,
    })
    await ledgerService.ensureWalletsForUser(referee.id)
    const wallet = await prisma.wallet.findFirstOrThrow({
      where: { userId: referee.id, kind: 'INVESTMENT' },
    })
    const method =
      (await prisma.paymentMethod.findFirst({ where: { isActive: true, deletedAt: null } })) ??
      (await prisma.paymentMethod.create({
        data: {
          name: `Snap Method ${randomUUID().slice(0, 6)}`,
          type: 'BANK_TRANSFER',
          instructions: 'test',
          minAmount: moneyString(1),
          maxAmount: moneyString(1_000_000),
          feePct: moneyString(0),
          isActive: true,
        },
      }))
    const deposit = await prisma.deposit.create({
      data: {
        reference: `DEP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
        userId: referee.id,
        walletId: wallet.id,
        paymentMethodId: method.id,
        amount: moneyString('100'),
        fee: moneyString(0),
        creditedAmount: moneyString('100'),
        status: 'APPROVED',
        reviewedAt: new Date(),
        idempotencyKey: `snap-dep-${randomUUID()}`,
      },
    })

    const reward = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, deposit),
    )
    expect(reward).toBeTruthy()
    const originalPercent = d(reward!.percentApplied).toFixed(4)
    const originalUnlock = reward!.unlockAt.toISOString()
    const originalAmount = moneyString(reward!.rewardAmount)

    await prisma.platformSetting.update({
      where: { id: settings.id },
      data: { referralPercent: '3', referralUnlockDays: 7, referralEnabled: false },
    })

    const reloaded = await prisma.referralReward.findUniqueOrThrow({ where: { id: reward!.id } })
    expect(d(reloaded.percentApplied).toFixed(4)).toBe(originalPercent)
    expect(reloaded.unlockAt.toISOString()).toBe(originalUnlock)
    expect(moneyString(reloaded.rewardAmount)).toBe(originalAmount)
    expect(originalPercent).toBe('5.0000')
  })

  it('8+9+10+11. Admin reward list, search, and pagination', async () => {
    const admin = await registerAndPromote({
      emailPrefix: 'adm_list',
      role: 'SUPER_ADMIN',
      staffRole: 'SUPER_ADMIN',
    })
    const agent = await loginAgent(admin.email, admin.password)

    const list = await agent.get('/api/v1/admin/referrals/rewards?limit=5&page=1')
    expect(list.status).toBe(200)
    expect(list.body.data).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
        pagination: expect.objectContaining({
          page: 1,
          limit: 5,
          total: expect.any(Number),
          totalPages: expect.any(Number),
        }),
      }),
    )
    for (const item of list.body.data.items as Array<{ status: string }>) {
      expect(['LOCKED', 'AVAILABLE', 'REDEEMED', 'CANCELLED']).toContain(item.status)
    }

    const byName = await agent.get('/api/v1/admin/referrals/rewards?q=Snap&limit=20')
    expect(byName.status).toBe(200)
    expect(
      (byName.body.data.items as Array<{ referrer: { lastName: string }; referee: { lastName: string } }>).some(
        (row) => row.referrer.lastName === 'Referrer' || row.referee.lastName === 'Referee',
      ),
    ).toBe(true)

    const referrer = await prisma.user.findFirst({
      where: { lastName: 'Referrer', email: { startsWith: 'snap_r_' } },
      orderBy: { createdAt: 'desc' },
    })
    expect(referrer?.referralCode).toBeTruthy()
    const byCode = await agent.get(
      `/api/v1/admin/referrals/rewards?q=${encodeURIComponent(referrer!.referralCode!)}&limit=20`,
    )
    expect(byCode.status).toBe(200)
    expect((byCode.body.data.items as unknown[]).length).toBeGreaterThan(0)

    const page2 = await agent.get('/api/v1/admin/referrals/rewards?limit=1&page=2')
    expect(page2.status).toBe(200)
    expect(page2.body.data.pagination.page).toBe(2)
    expect(page2.body.data.pagination.limit).toBe(1)

    const relationships = await agent.get('/api/v1/admin/referrals/relationships?q=Snap&limit=20')
    expect(relationships.status).toBe(200)
    expect((relationships.body.data.items as unknown[]).length).toBeGreaterThan(0)

    const overview = await agent.get('/api/v1/admin/referrals/summary')
    expect(overview.status).toBe(200)
    expect(overview.body.data.referralEnabled).toBe(false)
    expect(overview.body.data).toEqual(
      expect.objectContaining({
        totalRewardAmount: expect.any(String),
        lockedAmount: expect.any(String),
        availableAmount: expect.any(String),
        redeemedAmount: expect.any(String),
        relationshipCount: expect.any(Number),
        referredUserCount: expect.any(Number),
        referralDepositCount: expect.any(Number),
      }),
    )
  })

  it('12. Investor redeem remains the only normal redemption path (no admin redeem route)', async () => {
    const admin = await registerAndPromote({
      emailPrefix: 'adm_noredeem',
      role: 'SUPER_ADMIN',
      staffRole: 'SUPER_ADMIN',
    })
    const agent = await loginAgent(admin.email, admin.password)
    const reward = await prisma.referralReward.findFirst({ orderBy: { createdAt: 'desc' } })
    expect(reward).toBeTruthy()
    const redeem = await agent.post(`/api/v1/admin/referrals/rewards/${reward!.id}/redeem`)
    expect([404, 405]).toContain(redeem.status)
  })

  it('13. referralEnabled stays false unless explicitly enabled', async () => {
    const admin = await registerAndPromote({
      emailPrefix: 'adm_flag',
      role: 'SUPER_ADMIN',
      staffRole: 'SUPER_ADMIN',
    })
    const agent = await loginAgent(admin.email, admin.password)
    const res = await agent.put('/api/v1/admin/settings').send({
      referralPercent: '5',
      referralUnlockDays: 30,
    })
    expect(res.status).toBe(200)
    expect(res.body.data.referral.enabled).toBe(false)

    const settings = await settingsService.adminGet()
    expect(settings.referral.enabled).toBe(false)
  })
})
