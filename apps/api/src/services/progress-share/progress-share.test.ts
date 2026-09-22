import { createHmac, randomUUID } from 'node:crypto'

import { describe, expect, it, beforeAll } from 'vitest'
import request from 'supertest'

import { createApp } from '../../app.js'
import { prisma } from '../../database/prisma.js'
import { env } from '../../config/env.js'
import { ledgerService } from '../finance/ledger.service.js'
import { moneyString } from '../../utils/money.js'
import { buildProgressShareOverlay, buildProgressShareSvg, renderProgressSharePng } from './progress-share.image.js'
import { progressShareService } from './progress-share.service.js'
import {
  signProgressShareToken,
  verifyProgressShareToken,
} from './progress-share.token.js'
import type { ProgressShareSnapshot } from './progress-share.types.js'
import { renderEmailTemplate } from '../../emails/templates/index.js'

const app = createApp()

async function seedWallet(userId: string, invested: string, profit: string) {
  await ledgerService.ensureWalletsForUser(userId)
  await prisma.wallet.update({
    where: { userId_kind: { userId, kind: 'INVESTMENT' } },
    data: {
      investedAmount: moneyString(invested),
      totalProfit: moneyString(profit),
      balance: moneyString(invested),
      availableBalance: moneyString(invested),
    },
  })
}

async function registerAndLogin(email: string, password: string, firstName = 'Progress') {
  await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    firstName,
    lastName: 'Investor',
    acceptTerms: true,
    acceptRisk: true,
  })
  await prisma.user.updateMany({
    where: { email },
    data: { status: 'ACTIVE', emailVerifiedAt: new Date(), kycStatus: 'APPROVED' },
  })
  const agent = request.agent(app)
  const login = await agent.post('/api/v1/auth/login').send({ email, password })
  expect(login.status).toBeLessThan(400)
  const user = await prisma.user.findFirstOrThrow({ where: { email } })
  return { agent, user }
}

function readPng(agentOrRequest: request.Test) {
  return agentOrRequest.buffer(true).parse((res, callback) => {
    const chunks: Buffer[] = []
    res.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    res.on('end', () => callback(null, Buffer.concat(chunks)))
  })
}

function baseSnapshot(over: Partial<ProgressShareSnapshot> = {}): ProgressShareSnapshot {
  return {
    displayName: 'Aisha Khan',
    displayCurrency: 'USD',
    totalInvestment: '5000.00',
    totalEarnings: '542.50',
    earningsTillDate: '542.50',
    currentValue: '5542.50',
    performancePct: '10.850000',
    todayEarnings: '42.50',
    dailyReturnPct: '0.850000',
    asOfDate: '2026-08-11',
    brandName: 'Wealthora Capital',
    portfolioHistory: [
      { label: 'STARTED', value: '5000.00' },
      { label: 'NOW', value: '5542.50' },
    ],
    intradayPerformance: [],
    ...over,
  }
}

describe('Progress share tokens', () => {
  it('rejects expired share tokens', () => {
    const { token } = signProgressShareToken('user-1', -10)
    expect(() => verifyProgressShareToken(token)).toThrow(/expired/i)
  })

  it('rejects invalid share tokens', () => {
    expect(() => verifyProgressShareToken('not-a-token')).toThrow(/invalid/i)
    const { token } = signProgressShareToken('user-1')
    const [body] = token.split('.')
    const badSig = createHmac('sha256', 'wrong-secret-wrong-secret-wrong!!')
      .update(`psv1:${body}`)
      .digest('base64url')
    expect(() => verifyProgressShareToken(`${body}.${badSig}`)).toThrow(/invalid/i)
  })
})

describe('Progress share image content', () => {
  it('includes safe progress fields and omits sensitive data', () => {
    const overlay = buildProgressShareOverlay(
      baseSnapshot({
        displayName: 'Very Long Investor Name That Should Truncate Nicely',
        displayCurrency: 'USD',
        totalInvestment: '5000.00',
        totalEarnings: '504.52',
        earningsTillDate: '504.52',
      }),
    )
    const svg = buildProgressShareSvg(
      baseSnapshot({
        displayName: 'Very Long Investor Name That Should Truncate Nicely',
        totalInvestment: '5000.00',
        totalEarnings: '504.52',
      }),
    )
    expect(overlay).toContain('Very Long Investor')
    expect(overlay).toContain('+10.85')
    expect(overlay).toContain('5,000.00')
    expect(svg).toContain('width="1080"')
    expect(svg).toContain('height="1920"')
    expect(svg).toContain('data:image/jpeg;base64,')
    expect(overlay).not.toContain('₹')
    expect(overlay).not.toContain('INR')
    expect(overlay).not.toContain('@')
    expect(overlay).not.toContain('userId')
    expect(overlay).not.toContain('wallet')
    expect(overlay).not.toContain('0x')
    expect(overlay).not.toContain('KYC')
    expect(overlay).not.toContain('referral')
  })

  it('renders approved 1080×1920 PNGs for both kinds', () => {
    const daily = renderProgressSharePng(baseSnapshot(), 'daily')
    const journey = renderProgressSharePng(baseSnapshot(), 'journey')
    expect(daily.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(journey.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(daily.readUInt32BE(16)).toBe(1080)
    expect(daily.readUInt32BE(20)).toBe(1920)
    expect(journey.readUInt32BE(16)).toBe(1080)
    expect(journey.readUInt32BE(20)).toBe(1920)
  })

  it('daily template overlays earned-today values on the photo', () => {
    const overlay = buildProgressShareOverlay(baseSnapshot(), 'daily')
    expect(overlay).toContain('Aisha Khan')
    expect(overlay).toContain('42.50')
    expect(overlay).toContain('+0.85')
    expect(overlay).toContain('CURRENT BALANCE')
    expect(overlay).toContain('5,542.50')
    expect(overlay).not.toContain('₹')
  })

  it('journey template overlays live growth fields on the photo', () => {
    const overlay = buildProgressShareOverlay(baseSnapshot(), 'journey')
    expect(overlay).toContain('Aisha Khan')
    expect(overlay).toContain('+10.85')
    expect(overlay).toContain('+$542.50')
    expect(overlay).toContain('5,000.00')
    expect(overlay).toContain('5,542.50')
    expect(overlay).not.toContain('₹')
  })

  it('resolves share display names without privacy placeholders', () => {
    expect(
      progressShareService.displayNameFromUser({
        firstName: 'Aisha',
        lastName: 'Khan',
        email: 'aisha@example.com',
      }),
    ).toBe('Aisha Khan')
    expect(
      progressShareService.displayNameFromUser({
        firstName: 'Unknown',
        lastName: 'Incognito',
        email: 'priya.nair@example.com',
      }),
    ).toBe('priya.nair')
    expect(
      progressShareService.displayNameFromUser({
        firstName: 'Unknown',
        lastName: 'Incognito',
        email: 'unknown@example.com',
      }),
    ).toBe('Investor')
    expect(
      progressShareService.displayNameFromUser({
        firstName: 'Priya',
        lastName: 'Incognito',
        email: 'x@example.com',
      }),
    ).toBe('Priya')
  })

  it.each([['USD', '5000.00']] as const)('formats %s display currency', (_currency, amount) => {
    const svg = buildProgressShareSvg(
      baseSnapshot({
        displayCurrency: _currency,
        totalInvestment: amount,
        totalEarnings: amount,
        earningsTillDate: amount,
      }),
    )
    expect(svg).toContain('5,000.00')
  })
})

describe('Progress share HTTP API', () => {
  beforeAll(async () => {
    for (const code of ['SYS:CLEARING', 'SYS:PAYOUT', 'SYS:FEES', 'SYS:SUSPENSE']) {
      await prisma.ledgerAccount.upsert({
        where: { code },
        create: { code, name: code, accountType: 'ASSET', isSystem: true },
        update: {},
      })
    }
  })

  it('snapshot currentValue matches live available balance', async () => {
    const email = `ps_bal_${randomUUID().slice(0, 8)}@example.com`
    const { user } = await registerAndLogin(email, 'SecurePass1!')
    await seedWallet(user.id, '2500.00', '125.00')
    await prisma.wallet.update({
      where: { userId_kind: { userId: user.id, kind: 'INVESTMENT' } },
      data: {
        balance: moneyString('2800.00'),
        availableBalance: moneyString('2625.00'),
      },
    })

    const snapshot = await progressShareService.buildSnapshot(user.id)
    expect(snapshot.currentValue).toBe('2625.00')
    const overlay = buildProgressShareOverlay(snapshot, 'daily')
    expect(overlay).toContain('CURRENT BALANCE')
    expect(overlay).toContain('2,625.00')
  })

  it('real user daily return comes only from live ProfitDistribution', async () => {
    const email = `ps_real_dr_${randomUUID().slice(0, 8)}@example.com`
    const { user } = await registerAndLogin(email, 'SecurePass1!')
    await seedWallet(user.id, '1000.00', '0.00')
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)

    await prisma.dailyReturn.upsert({
      where: { date: today },
      create: {
        date: today,
        status: 'DISTRIBUTED',
        netReturnPct: moneyString('9.990000'),
        computedReturnPct: moneyString('9.990000'),
      },
      update: {
        status: 'DISTRIBUTED',
        netReturnPct: moneyString('9.990000'),
        computedReturnPct: moneyString('9.990000'),
      },
    })

    // Real user without today's distribution must stay at 0 — programme DailyReturn is not used.
    const empty = await progressShareService.buildSnapshot(user.id)
    expect(empty.dailyReturnPct).toBe('0.00')

    const daily = await prisma.dailyReturn.findUniqueOrThrow({ where: { date: today } })
    const run = await prisma.dailyReturnRun.create({
      data: {
        dailyReturnId: daily.id,
        date: today,
        returnPct: moneyString('1.250000'),
        returnBasis: 'BALANCE',
        status: 'COMPLETED',
        eligibleWallets: 1,
        processedWallets: 1,
        successfulWallets: 1,
        totalBaseAmount: moneyString(1000),
        totalDistributed: moneyString(12.5),
        idempotencyKey: `ps-real-${randomUUID()}`,
      },
    })
    await prisma.profitDistribution.create({
      data: {
        runId: run.id,
        userId: user.id,
        date: today,
        eligibleBalance: moneyString(1000),
        returnPct: moneyString('1.250000'),
        grossAmount: moneyString(12.5),
        amount: moneyString(12.5),
        balanceAfter: moneyString(1012.5),
        idempotencyKey: `ps-real-dist-${randomUUID()}`,
      },
    })

    const withLive = await progressShareService.buildSnapshot(user.id)
    expect(withLive.dailyReturnPct).toBe('1.250000')
    expect(withLive.todayEarnings).toBe('12.50')
  })

  it('demo user daily return comes from programme DailyReturn without ledger writes', async () => {
    const adminEmail = `ps_adm_${randomUUID().slice(0, 8)}@example.com`
    const admin = await registerAndLogin(adminEmail, 'SecurePass1!', 'Admin')
    await prisma.user.update({
      where: { id: admin.user.id },
      data: { role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' },
    })

    const demo = await prisma.user.create({
      data: {
        email: `ps_demo_${randomUUID().slice(0, 8)}@example.com`,
        passwordHash: 'x',
        firstName: 'Demo',
        lastName: 'Investor',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        kycStatus: 'APPROVED',
        role: 'USER',
        createdByAdminId: admin.user.id,
      },
    })
    await seedWallet(demo.id, '5000.00', '100.00')

    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
    await prisma.dailyReturn.upsert({
      where: { date: today },
      create: {
        date: today,
        status: 'DISTRIBUTED',
        netReturnPct: moneyString('0.960000'),
        computedReturnPct: moneyString('0.960000'),
      },
      update: {
        status: 'DISTRIBUTED',
        netReturnPct: moneyString('0.960000'),
        computedReturnPct: moneyString('0.960000'),
      },
    })

    const beforeWallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId_kind: { userId: demo.id, kind: 'INVESTMENT' } },
    })
    const beforeLedger = await prisma.ledgerEntry.count({
      where: { wallet: { userId: demo.id } },
    })
    const beforeDist = await prisma.profitDistribution.count({ where: { userId: demo.id } })
    const beforeDeposits = await prisma.deposit.count({ where: { userId: demo.id } })
    const beforeWithdrawals = await prisma.withdrawal.count({ where: { userId: demo.id } })

    const snapshot = await progressShareService.buildSnapshot(demo.id)
    expect(snapshot.dailyReturnPct).toBe('0.960000')
    expect(Number(snapshot.todayEarnings)).toBeCloseTo(48, 0) // 5000 * 0.96%
    const overlay = buildProgressShareOverlay(snapshot, 'daily')
    expect(overlay).toContain('+0.96')

    const afterWallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId_kind: { userId: demo.id, kind: 'INVESTMENT' } },
    })
    expect(afterWallet.availableBalance.toString()).toBe(beforeWallet.availableBalance.toString())
    expect(afterWallet.balance.toString()).toBe(beforeWallet.balance.toString())
    expect(await prisma.ledgerEntry.count({ where: { wallet: { userId: demo.id } } })).toBe(
      beforeLedger,
    )
    expect(await prisma.profitDistribution.count({ where: { userId: demo.id } })).toBe(beforeDist)
    expect(await prisma.deposit.count({ where: { userId: demo.id } })).toBe(beforeDeposits)
    expect(await prisma.withdrawal.count({ where: { userId: demo.id } })).toBe(beforeWithdrawals)
  })

  it('demo user falls back to historical ProfitDistribution return when no DailyReturn today', async () => {
    const admin = await prisma.user.create({
      data: {
        email: `ps_adm2_${randomUUID().slice(0, 8)}@example.com`,
        passwordHash: 'x',
        firstName: 'Admin',
        lastName: 'Two',
        status: 'ACTIVE',
        role: 'SUPER_ADMIN',
        staffRole: 'SUPER_ADMIN',
        emailVerifiedAt: new Date(),
      },
    })
    const demo = await prisma.user.create({
      data: {
        email: `ps_demo2_${randomUUID().slice(0, 8)}@example.com`,
        passwordHash: 'x',
        firstName: 'Hist',
        lastName: 'Demo',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        kycStatus: 'APPROVED',
        role: 'USER',
        createdByAdminId: admin.id,
      },
    })
    await seedWallet(demo.id, '2000.00', '50.00')

    const past = new Date('2026-01-15T00:00:00.000Z')
    const daily = await prisma.dailyReturn.upsert({
      where: { date: past },
      create: { date: past, status: 'DISTRIBUTED', netReturnPct: moneyString('0.500000') },
      update: {},
    })
    const run = await prisma.dailyReturnRun.create({
      data: {
        dailyReturnId: daily.id,
        date: past,
        returnPct: moneyString('0.750000'),
        returnBasis: 'BALANCE',
        status: 'COMPLETED',
        eligibleWallets: 1,
        processedWallets: 1,
        successfulWallets: 1,
        totalBaseAmount: moneyString(2000),
        totalDistributed: moneyString(15),
        idempotencyKey: `ps-hist-${randomUUID()}`,
      },
    })
    await prisma.profitDistribution.create({
      data: {
        runId: run.id,
        userId: demo.id,
        date: past,
        eligibleBalance: moneyString(2000),
        returnPct: moneyString('0.750000'),
        grossAmount: moneyString(15),
        amount: moneyString(15),
        balanceAfter: moneyString(2015),
        idempotencyKey: `ps-hist-dist-${randomUUID()}`,
      },
    })

    // Ensure today has no programme return for this test isolation when possible —
    // resolveDemoShareDailyReturn prefers today's DailyReturn; delete today's row if we created one
    // only for this test. Prefer historical by removing today's net if present from prior tests.
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
    const todayRow = await prisma.dailyReturn.findUnique({ where: { date: today } })
    if (todayRow) {
      await prisma.dailyReturn.update({
        where: { date: today },
        data: { netReturnPct: null, computedReturnPct: null },
      })
    }

    const snapshot = await progressShareService.buildSnapshot(demo.id)
    expect(snapshot.dailyReturnPct).toBe('0.750000')
  })

  it('demo share snapshot does not alter a separate real user wallet', async () => {
    const admin = await prisma.user.create({
      data: {
        email: `ps_adm3_${randomUUID().slice(0, 8)}@example.com`,
        passwordHash: 'x',
        firstName: 'Admin',
        lastName: 'Three',
        status: 'ACTIVE',
        role: 'SUPER_ADMIN',
        staffRole: 'SUPER_ADMIN',
        emailVerifiedAt: new Date(),
      },
    })
    const demo = await prisma.user.create({
      data: {
        email: `ps_demo3_${randomUUID().slice(0, 8)}@example.com`,
        passwordHash: 'x',
        firstName: 'Demo',
        lastName: 'Three',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        kycStatus: 'APPROVED',
        role: 'USER',
        createdByAdminId: admin.id,
      },
    })
    const realEmail = `ps_real_iso_${randomUUID().slice(0, 8)}@example.com`
    const { user: realUser } = await registerAndLogin(realEmail, 'SecurePass1!', 'Real')
    await seedWallet(demo.id, '3000.00', '0.00')
    await seedWallet(realUser.id, '4000.00', '0.00')

    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
    await prisma.dailyReturn.upsert({
      where: { date: today },
      create: {
        date: today,
        status: 'DISTRIBUTED',
        netReturnPct: moneyString('1.100000'),
        computedReturnPct: moneyString('1.100000'),
      },
      update: {
        netReturnPct: moneyString('1.100000'),
        computedReturnPct: moneyString('1.100000'),
      },
    })

    const beforeReal = await prisma.wallet.findUniqueOrThrow({
      where: { userId_kind: { userId: realUser.id, kind: 'INVESTMENT' } },
    })
    await progressShareService.buildSnapshot(demo.id)
    const afterReal = await prisma.wallet.findUniqueOrThrow({
      where: { userId_kind: { userId: realUser.id, kind: 'INVESTMENT' } },
    })
    expect(afterReal.availableBalance.toString()).toBe(beforeReal.availableBalance.toString())
    expect(await prisma.profitDistribution.count({ where: { userId: realUser.id } })).toBe(0)
  })

  it('admin financial filters still exclude demo investors', async () => {
    const { realInvestorUser, realDepositWhere, realProfitWhere } = await import(
      '../demo-investor.js'
    )
    expect(realInvestorUser).toEqual({
      createdByAdminId: null,
      role: 'USER',
      deletedAt: null,
    })
    expect(realDepositWhere()).toMatchObject({
      AND: [{ user: { createdByAdminId: null, role: 'USER', deletedAt: null } }],
    })
    expect(realProfitWhere()).toMatchObject({
      AND: [{ user: { createdByAdminId: null, role: 'USER', deletedAt: null } }],
    })
  })

  it('authenticated user can generate their own image', async () => {
    const email = `ps_auth_${randomUUID().slice(0, 8)}@example.com`
    const { agent, user } = await registerAndLogin(email, 'SecurePass1!')
    await seedWallet(user.id, '1000.00', '50.00')

    const image = await readPng(agent.get('/api/v1/progress-share/image'))
    expect(image.status).toBe(200)
    expect(image.headers['content-type']).toMatch(/image\/png/)
    expect(Buffer.isBuffer(image.body)).toBe(true)
    expect((image.body as Buffer).length).toBeGreaterThan(1000)
    // PNG magic bytes
    expect((image.body as Buffer).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    const png = image.body as Buffer
    expect(png.readUInt32BE(16)).toBe(1080)
    expect(png.readUInt32BE(20)).toBe(1920)
  })

  it('daily kind renders a separate 1080×1920 PNG', async () => {
    const email = `ps_daily_${randomUUID().slice(0, 8)}@example.com`
    const { agent, user } = await registerAndLogin(email, 'SecurePass1!')
    await seedWallet(user.id, '1000.00', '50.00')
    const image = await readPng(agent.get('/api/v1/progress-share/image?kind=daily'))
    expect(image.status).toBe(200)
    const png = image.body as Buffer
    expect(png.readUInt32BE(16)).toBe(1080)
    expect(png.readUInt32BE(20)).toBe(1920)
  })

  it('rejects userId query IDOR attempts', async () => {
    const emailA = `ps_a_${randomUUID().slice(0, 8)}@example.com`
    const emailB = `ps_b_${randomUUID().slice(0, 8)}@example.com`
    const a = await registerAndLogin(emailA, 'SecurePass1!', 'Alpha')
    const b = await registerAndLogin(emailB, 'SecurePass1!', 'Beta')
    await seedWallet(a.user.id, '1000.00', '10.00')
    await seedWallet(b.user.id, '9000.00', '900.00')

    const idor = await a.agent.get(`/api/v1/progress-share/image?userId=${b.user.id}`)
    expect(idor.status).toBe(400)
    expect(idor.body?.error?.message ?? '').toMatch(/userId/i)

    const own = await readPng(a.agent.get('/api/v1/progress-share/image'))
    expect(own.status).toBe(200)
  })

  it('expired and invalid tokens are rejected', async () => {
    const email = `ps_tok_${randomUUID().slice(0, 8)}@example.com`
    const { user } = await registerAndLogin(email, 'SecurePass1!')
    await seedWallet(user.id, '1000.00', '10.00')

    const { token: expired } = signProgressShareToken(user.id, -5)
    const expiredRes = await request(app).get(
      `/api/v1/progress-share/image?t=${encodeURIComponent(expired)}`,
    )
    expect(expiredRes.status).toBe(401)

    const invalidRes = await request(app).get(
      '/api/v1/progress-share/image?t=not-valid-token-value-here',
    )
    expect([400, 401]).toContain(invalidRes.status)
  })

  it('image generation does not alter wallet or ledger', async () => {
    const email = `ps_ledger_${randomUUID().slice(0, 8)}@example.com`
    const { agent, user } = await registerAndLogin(email, 'SecurePass1!')
    await seedWallet(user.id, '2500.00', '125.00')

    const beforeWallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId_kind: { userId: user.id, kind: 'INVESTMENT' } },
    })
    const beforeLedger = await prisma.ledgerEntry.count({
      where: { wallet: { userId: user.id } },
    })

    const image = await readPng(agent.get('/api/v1/progress-share/image'))
    expect(image.status).toBe(200)

    const afterWallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId_kind: { userId: user.id, kind: 'INVESTMENT' } },
    })
    const afterLedger = await prisma.ledgerEntry.count({
      where: { wallet: { userId: user.id } },
    })

    expect(afterWallet.balance.toString()).toBe(beforeWallet.balance.toString())
    expect(afterWallet.totalProfit.toString()).toBe(beforeWallet.totalProfit.toString())
    expect(afterWallet.investedAmount.toString()).toBe(beforeWallet.investedAmount.toString())
    expect(afterLedger).toBe(beforeLedger)
  })

  it('Earnings Till Date matches investment wallet totalProfit (Daily Profit source)', async () => {
    const email = `ps_etd_${randomUUID().slice(0, 8)}@example.com`
    const { user } = await registerAndLogin(email, 'SecurePass1!')
    await seedWallet(user.id, '2000.00', '321.45')

    const snapshot = await progressShareService.buildSnapshot(user.id)
    expect(snapshot.earningsTillDate).toBe(snapshot.totalEarnings)
    expect(snapshot.earningsTillDate).toBe('321.45')
    expect(snapshot.totalInvestment).toBe('2000.00')
    expect(snapshot.currentValue).toBeDefined()
    expect(snapshot.portfolioHistory.length).toBeGreaterThanOrEqual(2)
    expect(snapshot.intradayPerformance).toEqual([])
  })

  it('always presents USD ledger amounts regardless of profile displayCurrency', async () => {
    const email = `ps_fx_${randomUUID().slice(0, 8)}@example.com`
    const { user } = await registerAndLogin(email, 'SecurePass1!')
    await seedWallet(user.id, '100.00', '10.00')

    await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, displayCurrency: 'INR', language: 'en' },
      update: { displayCurrency: 'INR' },
    })
    const inr = await progressShareService.buildSnapshot(user.id)
    expect(inr.displayCurrency).toBe('USD')
    expect(inr.totalInvestment).toBe('100.00')
    expect(inr.totalEarnings).toBe('10.00')

    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { displayCurrency: 'EUR' },
    })
    const eur = await progressShareService.buildSnapshot(user.id)
    expect(eur.displayCurrency).toBe('USD')
    expect(eur.totalInvestment).toBe('100.00')

    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { displayCurrency: 'GBP' },
    })
    const gbp = await progressShareService.buildSnapshot(user.id)
    expect(gbp.displayCurrency).toBe('USD')
    expect(gbp.totalInvestment).toBe('100.00')
  })

  it('snapshot never includes sensitive fields', async () => {
    const email = `ps_safe_${randomUUID().slice(0, 8)}@example.com`
    const { agent, user } = await registerAndLogin(email, 'SecurePass1!')
    await seedWallet(user.id, '100.00', '5.00')
    const res = await agent.get('/api/v1/progress-share/snapshot')
    expect(res.status).toBe(200)
    const data = res.body.data
    const json = JSON.stringify(data)
    expect(json).not.toContain(email)
    expect(json).not.toContain(user.id)
    expect(data).not.toHaveProperty('email')
    expect(data).not.toHaveProperty('phone')
    expect(data).not.toHaveProperty('walletAddress')
  })

  it('createLink returns share + image URLs using APP_URL / API_URL', async () => {
    const email = `ps_link_${randomUUID().slice(0, 8)}@example.com`
    const { agent, user } = await registerAndLogin(email, 'SecurePass1!')
    await seedWallet(user.id, '100.00', '5.00')
    const res = await agent.post('/api/v1/progress-share/link')
    expect(res.status).toBe(200)
    expect(res.body.data.shareUrl).toContain('/progress-share?t=')
    expect(res.body.data.shareUrl).toContain('kind=daily')
    expect(res.body.data.imageUrl).toContain('/api/v1/progress-share/image?t=')
    expect(res.body.data.imageUrl).toContain('kind=daily')
    expect(res.body.data.dailyImageUrl).toContain('kind=daily')
    expect(res.body.data.journeyImageUrl).toContain('kind=journey')
    expect(res.body.data.shareUrl.startsWith(env.APP_URL.replace(/\/$/, ''))).toBe(true)
  })
})

describe('Daily Profit email Share My Progress CTA', () => {
  it('renders Share My Progress when shareProgressUrl is provided', () => {
    const rendered = renderEmailTemplate('daily-roi', {
      firstName: 'Aisha',
      returnPct: '0.85',
      profit: '42.50',
      investmentValue: '5000.00',
      closingBalance: '5042.50',
      earningsTillDate: '542.50',
      date: '2026-08-11',
      reference: 'DR-1',
      shareProgressUrl: `${env.APP_URL}/progress-share?t=abc`,
    })
    expect(rendered.html).toContain('Share My Progress')
    expect(rendered.html).toContain('progress-share?t=abc')
    expect(rendered.html).toContain('Earnings Till Date')
    expect(rendered.html).toContain("Today's trading return")
  })
})
