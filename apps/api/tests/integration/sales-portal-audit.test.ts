import { randomUUID } from 'node:crypto'

import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { COOKIE_NAMES } from '../../src/config/cookies.js'
import { SALES_COOKIE_NAMES } from '../../src/config/sales-cookies.js'
import { prisma } from '../../src/database/prisma.js'
import { batchUserFinance } from '../../src/services/admin-users-finance.js'
import { ledgerService } from '../../src/services/finance/ledger.service.js'
import { passwordService } from '../../src/services/password.service.js'
import { moneyString } from '../../src/utils/money.js'

/**
 * Phase 7 security + finance audit cases that were not already asserted
 * as named tests in sales-auth / sales-attribution / sales-network.
 */
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

function uniqueEmail(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}@example.com`
}

function uniqueCode() {
  return `S${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

function cookieLines(res: { headers: Record<string, unknown> }): string[] {
  const raw = res.headers['set-cookie']
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') return [raw]
  return []
}

function cookieValue(res: { headers: Record<string, unknown> }, name: string): string | undefined {
  const prefix = `${name}=`
  for (const line of cookieLines(res)) {
    if (line.startsWith(prefix) || line.toLowerCase().startsWith(prefix.toLowerCase())) {
      return decodeURIComponent(line.slice(prefix.length).split(';')[0] ?? '')
    }
  }
  return undefined
}

async function createSalesman() {
  const password = 'SecureSales1!'
  const salesman = await prisma.salesman.create({
    data: {
      email: uniqueEmail('audit'),
      passwordHash: await passwordService.hash(password),
      name: 'Audit Sales',
      code: uniqueCode(),
      status: 'ACTIVE',
    },
  })
  return { salesman, password }
}

async function loginSales(email: string, password: string) {
  const agent = request.agent(app)
  const login = await agent.post('/api/v1/sales/auth/login').send({ email, password })
  expect(login.status).toBe(200)
  return { agent, login }
}

async function createInvestor(opts?: { referredById?: string }) {
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail('fin'),
      passwordHash: await passwordService.hash('SecurePass1!'),
      firstName: 'Audit',
      lastName: 'Investor',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
      ...(opts?.referredById ? { referredById: opts.referredById } : {}),
    },
  })
  await ledgerService.ensureWalletsForUser(user.id)
  return user
}

async function paymentMethod() {
  return (
    (await prisma.paymentMethod.findFirst({ where: { isActive: true, deletedAt: null } })) ??
    (await prisma.paymentMethod.create({
      data: {
        name: `Audit Method ${randomUUID().slice(0, 6)}`,
        type: 'BANK_TRANSFER',
        instructions: 'test',
        minAmount: moneyString(1),
        maxAmount: moneyString(1_000_000),
        feePct: moneyString(0),
        isActive: true,
      },
    }))
  )
}

async function addDeposit(
  userId: string,
  amount: string,
  status: 'APPROVED' | 'PENDING' | 'REJECTED',
  creditedAmount?: string,
) {
  const wallet = await prisma.wallet.findFirstOrThrow({
    where: { userId, kind: 'INVESTMENT' },
  })
  const method = await paymentMethod()
  return prisma.deposit.create({
    data: {
      reference: `DEP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
      userId,
      walletId: wallet.id,
      paymentMethodId: method.id,
      amount: moneyString(amount),
      fee: moneyString(0),
      creditedAmount: creditedAmount ? moneyString(creditedAmount) : moneyString(amount),
      status,
      reviewedAt: status === 'APPROVED' ? new Date() : null,
      idempotencyKey: `audit-dep-${randomUUID()}`,
    },
  })
}

async function addWithdrawal(
  userId: string,
  amount: string,
  status: 'COMPLETED' | 'PAID' | 'PENDING' | 'REJECTED',
  netAmount?: string,
) {
  const wallet = await prisma.wallet.findFirstOrThrow({
    where: { userId, kind: 'INVESTMENT' },
  })
  const payout = await prisma.payoutMethod.create({
    data: {
      userId,
      label: 'Audit payout',
      type: 'USDT_TRC20',
      details: { address: 'TQA' },
      maskedDetails: 'TQA••••',
      isDefault: true,
      isVerified: true,
    },
  })
  return prisma.withdrawal.create({
    data: {
      reference: `WD-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
      userId,
      walletId: wallet.id,
      payoutMethodId: payout.id,
      amount: moneyString(amount),
      fee: moneyString(0),
      netAmount: moneyString(netAmount ?? amount),
      destinationLabel: 'Audit payout',
      destinationSnapshot: { address: 'TQA' },
      status,
      idempotencyKey: `audit-wd-${randomUUID()}`,
    },
  })
}

describe('Phase 7 Sales Portal security audit', () => {
  beforeAll(async () => {
    await ensureSystemAccounts()
  })

  it('expired salesman session is rejected even with a still-signed JWT', async () => {
    const { salesman, password } = await createSalesman()
    const { agent } = await loginSales(salesman.email, password)
    await prisma.salesmanSession.updateMany({
      where: { salesmanId: salesman.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    })
    const me = await agent.get('/api/v1/sales/me')
    expect(me.status).toBe(401)
  })

  it('reusing a rotated refresh token revokes the token family', async () => {
    const { salesman, password } = await createSalesman()
    const first = await request(app).post('/api/v1/sales/auth/login').send({
      email: salesman.email,
      password,
    })
    expect(first.status).toBe(200)
    const oldRefresh = cookieValue(first, SALES_COOKIE_NAMES.refreshToken)
    expect(oldRefresh).toBeTruthy()

    const rotated = await request(app)
      .post('/api/v1/sales/auth/refresh')
      .set('Cookie', `${SALES_COOKIE_NAMES.refreshToken}=${oldRefresh}`)
    expect(rotated.status).toBe(200)
    const newRefresh = cookieValue(rotated, SALES_COOKIE_NAMES.refreshToken)
    expect(newRefresh).toBeTruthy()
    expect(newRefresh).not.toBe(oldRefresh)

    const reuse = await request(app)
      .post('/api/v1/sales/auth/refresh')
      .set('Cookie', `${SALES_COOKIE_NAMES.refreshToken}=${oldRefresh}`)
    expect(reuse.status).toBe(401)

    const family = await prisma.salesmanSession.findMany({
      where: { salesmanId: salesman.id },
    })
    expect(family.length).toBeGreaterThan(1)
    expect(family.every((row) => row.revokedAt !== null)).toBe(true)

    const nextRefresh = await request(app)
      .post('/api/v1/sales/auth/refresh')
      .set('Cookie', `${SALES_COOKIE_NAMES.refreshToken}=${newRefresh}`)
    expect(nextRefresh.status).toBe(401)
  })

  it('disabled salesman cannot keep using an existing session', async () => {
    const { salesman, password } = await createSalesman()
    const { agent } = await loginSales(salesman.email, password)
    await prisma.salesman.update({
      where: { id: salesman.id },
      data: { status: 'DISABLED' },
    })
    const me = await agent.get('/api/v1/sales/me')
    expect(me.status).toBe(401)
    expect(me.body.error?.code).toBe('ACCOUNT_SUSPENDED')
  })

  it('empty network returns zeroed API summary values', async () => {
    const { salesman, password } = await createSalesman()
    const { agent } = await loginSales(salesman.email, password)
    const res = await agent.get('/api/v1/sales/me/network/summary')
    expect(res.status).toBe(200)
    expect(res.body.data.summary).toMatchObject({
      totalMembers: 0,
      directMembers: 0,
      maxDepth: 0,
      totalApprovedDeposits: '0.00',
      totalPaidWithdrawals: '0.00',
      netFunds: '0.00',
    })
  })

  it('matches admin finance on the Phase 7 deposit/withdrawal fixture', async () => {
    const { salesman, password } = await createSalesman()
    const user = await createInvestor()
    await prisma.salesAttribution.create({
      data: { userId: user.id, salesmanId: salesman.id, source: 'SALESMAN_LINK' },
    })

    await addDeposit(user.id, '1000', 'APPROVED')
    await addDeposit(user.id, '2000', 'APPROVED', '1900')
    await addDeposit(user.id, '500', 'PENDING')
    await addDeposit(user.id, '700', 'REJECTED')
    await addWithdrawal(user.id, '300', 'COMPLETED')
    await addWithdrawal(user.id, '200', 'PENDING')
    await addWithdrawal(user.id, '100', 'REJECTED')

    const { agent } = await loginSales(salesman.email, password)
    const summary = await agent.get('/api/v1/sales/me/network/summary')
    expect(summary.status).toBe(200)
    expect(summary.body.data.summary).toMatchObject({
      totalApprovedDeposits: '2900.00',
      totalPaidWithdrawals: '300.00',
      netFunds: '2600.00',
    })

    const admin = await batchUserFinance([user.id])
    expect(admin.get(user.id)?.totalDeposited).toBe('2900.00')
    expect(admin.get(user.id)?.totalWithdrawn).toBe('300.00')
    expect(summary.body.data.summary.totalApprovedDeposits).toBe(admin.get(user.id)?.totalDeposited)
    expect(summary.body.data.summary.totalPaidWithdrawals).toBe(admin.get(user.id)?.totalWithdrawn)
  })

  it('caps referredById recursion at depth 32', { timeout: 120_000 }, async () => {
    const { salesman, password } = await createSalesman()
    const chain: string[] = []
    let parentId: string | undefined
    for (let i = 0; i < 34; i += 1) {
      const user = await createInvestor(parentId ? { referredById: parentId } : undefined)
      chain.push(user.id)
      parentId = user.id
    }
    await prisma.salesAttribution.create({
      data: { userId: chain[0]!, salesmanId: salesman.id, source: 'SALESMAN_LINK' },
    })
    const { agent } = await loginSales(salesman.email, password)
    const res = await agent.get('/api/v1/sales/me/network/members')
    expect(res.status).toBe(200)
    const ids = res.body.data.members.map((row: { userId: string }) => row.userId)
    expect(ids).toHaveLength(33)
    expect(ids).toContain(chain[0])
    expect(ids).toContain(chain[32])
    expect(ids).not.toContain(chain[33])
    expect(Math.max(...res.body.data.members.map((row: { level: number }) => row.level))).toBe(32)
  })

  it('salesman cookies cannot call investor /auth/me or owner salesmen', async () => {
    const { salesman, password } = await createSalesman()
    const { agent } = await loginSales(salesman.email, password)
    const me = await agent.get('/api/v1/auth/me')
    expect(me.status).toBe(401)
    const owner = await agent.get('/api/v1/sales/owner/salesmen')
    expect([401, 403]).toContain(owner.status)
  })

  it('investor cookies cannot call /sales/me or /sales/owner/salesmen as owner', async () => {
    const email = uniqueEmail('plain')
    const password = 'SecurePass1!'
    const reg = await request(app).post('/api/v1/auth/register').send({
      email,
      password,
      firstName: 'Plain',
      lastName: 'Investor',
      acceptTerms: true,
      acceptRisk: true,
    })
    expect([200, 201]).toContain(reg.status)
    await prisma.user.updateMany({
      where: { email },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    })
    const agent = request.agent(app)
    const login = await agent.post('/api/v1/auth/login').send({ email, password })
    expect(login.status).toBe(200)
    expect(cookieValue(login, COOKIE_NAMES.accessToken)).toBeTruthy()

    const salesMe = await agent.get('/api/v1/sales/me')
    expect(salesMe.status).toBe(401)
    const owner = await agent.get('/api/v1/sales/owner/salesmen')
    expect(owner.status).toBe(403)
  })
})
