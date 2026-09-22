import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { prisma } from '../../src/database/prisma.js'
import { ledgerService } from '../../src/services/finance/ledger.service.js'
import { passwordService } from '../../src/services/password.service.js'
import { moneyString } from '../../src/utils/money.js'

const app = createApp()

function uniqueEmail(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}@example.com`
}

function uniqueCode() {
  return `S${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

async function loginAdmin() {
  const email = uniqueEmail('adm_attr')
  const password = 'SecurePass1!'
  await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    firstName: 'Admin',
    lastName: 'Attribution',
    acceptTerms: true,
    acceptRisk: true,
  })
  await prisma.user.updateMany({
    where: { email },
    data: {
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      role: 'SUPER_ADMIN',
      staffRole: 'SUPER_ADMIN',
    },
  })
  const agent = request.agent(app)
  const login = await agent.post('/api/v1/auth/login').send({ email, password })
  expect(login.status).toBe(200)
  const csrf = login.body.data.csrfToken as string
  return { agent, csrf }
}

async function createReferrer() {
  return prisma.user.create({
    data: {
      email: uniqueEmail('referrer'),
      passwordHash: 'x',
      firstName: 'Ref',
      lastName: 'Parent',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
    },
  })
}

async function createSalesman() {
  return prisma.salesman.create({
    data: {
      email: uniqueEmail('sm'),
      passwordHash: await passwordService.hash('SecureSales1!'),
      name: 'Attribution Sales',
      code: uniqueCode(),
      status: 'ACTIVE',
    },
  })
}

async function createInvestor(opts?: { referredById?: string; salesmanId?: string }) {
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail('inv'),
      passwordHash: 'x',
      firstName: 'Target',
      lastName: 'Investor',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
      ...(opts?.referredById ? { referredById: opts.referredById } : {}),
    },
  })
  await ledgerService.ensureWalletsForUser(user.id)
  if (opts?.salesmanId) {
    await prisma.salesAttribution.create({
      data: { userId: user.id, salesmanId: opts.salesmanId, source: 'SALESMAN_LINK' },
    })
  }
  return user
}

async function paymentMethod() {
  return (
    (await prisma.paymentMethod.findFirst({ where: { isActive: true, deletedAt: null } })) ??
    (await prisma.paymentMethod.create({
      data: {
        name: `Attr Method ${randomUUID().slice(0, 6)}`,
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

async function seedDeposit(userId: string) {
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
      amount: moneyString(50),
      fee: moneyString(0),
      status: 'PENDING',
      idempotencyKey: `attr-dep-${randomUUID()}`,
    },
  })
}

async function seedWithdrawal(userId: string) {
  const wallet = await prisma.wallet.findFirstOrThrow({
    where: { userId, kind: 'INVESTMENT' },
  })
  const payout = await prisma.payoutMethod.create({
    data: {
      userId,
      label: 'Attr payout',
      type: 'USDT_TRC20',
      details: { address: 'TATTR' },
      maskedDetails: 'TATTR••••',
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
      amount: moneyString(20),
      fee: moneyString(0),
      netAmount: moneyString(20),
      destinationLabel: 'Attr payout',
      destinationSnapshot: { address: 'TATTR' },
      status: 'PENDING',
      idempotencyKey: `attr-wd-${randomUUID()}`,
    },
  })
}

type AttributionPayload = {
  referral: {
    referredBy: {
      id: string
      name: string
      username: string
      referralCode: string | null
    }
  } | null
  salesman: { id: string; name: string; code: string } | null
}

function expectAttribution(
  body: AttributionPayload,
  expected: {
    referrer?: { id: string; referralCode: string | null }
    salesman?: { id: string; code: string }
  },
) {
  if (expected.referrer) {
    expect(body.referral?.referredBy.id).toBe(expected.referrer.id)
    expect(body.referral?.referredBy.referralCode).toBe(expected.referrer.referralCode)
    expect(body.referral?.referredBy.username).toBeTruthy()
  } else {
    expect(body.referral).toBeNull()
  }
  if (expected.salesman) {
    expect(body.salesman?.id).toBe(expected.salesman.id)
    expect(body.salesman?.code).toBe(expected.salesman.code)
  } else {
    expect(body.salesman).toBeNull()
  }
}

describe('Admin user referral and salesman attribution', () => {
  it('returns referrer and salesman on admin user profile', async () => {
    const { agent, csrf } = await loginAdmin()
    const referrer = await createReferrer()
    const salesman = await createSalesman()
    const user = await createInvestor({ referredById: referrer.id, salesmanId: salesman.id })

    const res = await agent.get(`/api/v1/admin/users/${user.id}`).set('x-csrf-token', csrf)
    expect(res.status).toBe(200)
    expectAttribution(res.body.data, {
      referrer: { id: referrer.id, referralCode: referrer.referralCode },
      salesman: { id: salesman.id, code: salesman.code },
    })
  })

  it('returns referrer only when no salesman attribution', async () => {
    const { agent, csrf } = await loginAdmin()
    const referrer = await createReferrer()
    const user = await createInvestor({ referredById: referrer.id })

    const res = await agent.get(`/api/v1/admin/users/${user.id}`).set('x-csrf-token', csrf)
    expect(res.status).toBe(200)
    expectAttribution(res.body.data, {
      referrer: { id: referrer.id, referralCode: referrer.referralCode },
    })
  })

  it('returns salesman only when no referrer', async () => {
    const { agent, csrf } = await loginAdmin()
    const salesman = await createSalesman()
    const user = await createInvestor({ salesmanId: salesman.id })

    const res = await agent.get(`/api/v1/admin/users/${user.id}`).set('x-csrf-token', csrf)
    expect(res.status).toBe(200)
    expectAttribution(res.body.data, { salesman: { id: salesman.id, code: salesman.code } })
  })

  it('returns null referral and salesman when neither exists', async () => {
    const { agent, csrf } = await loginAdmin()
    const user = await createInvestor()

    const res = await agent.get(`/api/v1/admin/users/${user.id}`).set('x-csrf-token', csrf)
    expect(res.status).toBe(200)
    expectAttribution(res.body.data, {})
  })

  it('inherits salesman through the referral chain for admin profile', async () => {
    const { agent, csrf } = await loginAdmin()
    const salesman = await createSalesman()
    const u1 = await createInvestor({ salesmanId: salesman.id })
    const u2 = await createInvestor({ referredById: u1.id })
    const u3 = await createInvestor({ referredById: u2.id })
    const u4 = await createInvestor({ referredById: u3.id })
    const u5 = await createInvestor({ referredById: u4.id })

    for (const [user, referrer] of [
      [u1, null],
      [u2, u1],
      [u3, u2],
      [u5, u4],
    ] as const) {
      const res = await agent.get(`/api/v1/admin/users/${user.id}`).set('x-csrf-token', csrf)
      expect(res.status).toBe(200)
      expectAttribution(res.body.data, {
        ...(referrer
          ? { referrer: { id: referrer.id, referralCode: referrer.referralCode } }
          : {}),
        salesman: { id: salesman.id, code: salesman.code },
      })
    }

    // CASE 8: U3's referredBy stays U2 even though salesman comes from U1.
    const u3Res = await agent.get(`/api/v1/admin/users/${u3.id}`).set('x-csrf-token', csrf)
    expect(u3Res.body.data.referral.referredBy.id).toBe(u2.id)
    expect(u3Res.body.data.salesman.id).toBe(salesman.id)
  })

  it('lets a mid-chain direct SalesAttribution win for that user and descendants', async () => {
    const { agent, csrf } = await loginAdmin()
    const salesman1 = await createSalesman()
    const salesman2 = await createSalesman()
    const u1 = await createInvestor({ salesmanId: salesman1.id })
    const u2 = await createInvestor({ referredById: u1.id, salesmanId: salesman2.id })
    const u3 = await createInvestor({ referredById: u2.id })

    const u2Res = await agent.get(`/api/v1/admin/users/${u2.id}`).set('x-csrf-token', csrf)
    expect(u2Res.status).toBe(200)
    expectAttribution(u2Res.body.data, {
      referrer: { id: u1.id, referralCode: u1.referralCode },
      salesman: { id: salesman2.id, code: salesman2.code },
    })

    const u3Res = await agent.get(`/api/v1/admin/users/${u3.id}`).set('x-csrf-token', csrf)
    expect(u3Res.status).toBe(200)
    expectAttribution(u3Res.body.data, {
      referrer: { id: u2.id, referralCode: u2.referralCode },
      salesman: { id: salesman2.id, code: salesman2.code },
    })
  })

  it('terminates safely when the referral chain contains a cycle', async () => {
    const { agent, csrf } = await loginAdmin()
    const u1 = await createInvestor()
    const u2 = await createInvestor({ referredById: u1.id })
    const u3 = await createInvestor({ referredById: u2.id })
    await prisma.user.update({ where: { id: u1.id }, data: { referredById: u3.id } })

    const res = await agent.get(`/api/v1/admin/users/${u3.id}`).set('x-csrf-token', csrf)
    expect(res.status).toBe(200)
    expect(res.body.data.salesman).toBeNull()
    expect(res.body.data.referral.referredBy.id).toBe(u2.id)
  })

  it('resolves attribution on admin deposit detail from deposit user', async () => {
    const { agent, csrf } = await loginAdmin()
    const referrer = await createReferrer()
    const salesman = await createSalesman()
    const user = await createInvestor({ referredById: referrer.id, salesmanId: salesman.id })
    const deposit = await seedDeposit(user.id)

    const res = await agent.get(`/api/v1/admin/deposits/${deposit.id}`).set('x-csrf-token', csrf)
    expect(res.status).toBe(200)
    expectAttribution(res.body.data, {
      referrer: { id: referrer.id, referralCode: referrer.referralCode },
      salesman: { id: salesman.id, code: salesman.code },
    })
  })

  it('resolves inherited salesman on admin deposit detail', async () => {
    const { agent, csrf } = await loginAdmin()
    const salesman = await createSalesman()
    const u1 = await createInvestor({ salesmanId: salesman.id })
    const u2 = await createInvestor({ referredById: u1.id })
    const u3 = await createInvestor({ referredById: u2.id })
    const deposit = await seedDeposit(u3.id)

    const res = await agent.get(`/api/v1/admin/deposits/${deposit.id}`).set('x-csrf-token', csrf)
    expect(res.status).toBe(200)
    expectAttribution(res.body.data, {
      referrer: { id: u2.id, referralCode: u2.referralCode },
      salesman: { id: salesman.id, code: salesman.code },
    })
  })

  it('resolves attribution on admin withdrawal detail from withdrawal user', async () => {
    const { agent, csrf } = await loginAdmin()
    const referrer = await createReferrer()
    const salesman = await createSalesman()
    const user = await createInvestor({ referredById: referrer.id, salesmanId: salesman.id })
    const withdrawal = await seedWithdrawal(user.id)

    const res = await agent
      .get(`/api/v1/admin/withdrawals/${withdrawal.id}`)
      .set('x-csrf-token', csrf)
    expect(res.status).toBe(200)
    expectAttribution(res.body.data, {
      referrer: { id: referrer.id, referralCode: referrer.referralCode },
      salesman: { id: salesman.id, code: salesman.code },
    })
  })

  it('resolves inherited salesman on admin withdrawal detail', async () => {
    const { agent, csrf } = await loginAdmin()
    const salesman = await createSalesman()
    const u1 = await createInvestor({ salesmanId: salesman.id })
    const u2 = await createInvestor({ referredById: u1.id })
    const u3 = await createInvestor({ referredById: u2.id })
    const withdrawal = await seedWithdrawal(u3.id)

    const res = await agent
      .get(`/api/v1/admin/withdrawals/${withdrawal.id}`)
      .set('x-csrf-token', csrf)
    expect(res.status).toBe(200)
    expectAttribution(res.body.data, {
      referrer: { id: u2.id, referralCode: u2.referralCode },
      salesman: { id: salesman.id, code: salesman.code },
    })
  })

  it('denies non-admin access to admin user attribution fields', async () => {
    const referrer = await createReferrer()
    const user = await createInvestor({ referredById: referrer.id })
    const email = user.email
    const password = 'SecurePass1!'
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await passwordService.hash(password) },
    })

    const investorAgent = request.agent(app)
    const login = await investorAgent.post('/api/v1/auth/login').send({ email, password })
    expect(login.status).toBe(200)

    const denied = await investorAgent.get(`/api/v1/admin/users/${user.id}`)
    expect([401, 403]).toContain(denied.status)
  })
})
