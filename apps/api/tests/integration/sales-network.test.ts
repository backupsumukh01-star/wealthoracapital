import { randomUUID } from 'node:crypto'

import { describe, expect, it, beforeAll } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { prisma } from '../../src/database/prisma.js'
import { batchUserFinance } from '../../src/services/admin-users-finance.js'
import { ledgerService } from '../../src/services/finance/ledger.service.js'
import { passwordService } from '../../src/services/password.service.js'
import { moneyString } from '../../src/utils/money.js'

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

async function createSalesman() {
  const password = 'SecureSales1!'
  const salesman = await prisma.salesman.create({
    data: {
      email: uniqueEmail('sm'),
      passwordHash: await passwordService.hash(password),
      name: 'Network Sales',
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
  return agent
}

async function createInvestor(opts?: {
  firstName?: string
  lastName?: string
  referredById?: string
}) {
  const email = uniqueEmail('inv')
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await passwordService.hash('SecurePass1!'),
      firstName: opts?.firstName ?? 'Inv',
      lastName: opts?.lastName ?? 'User',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
      ...(opts?.referredById ? { referredById: opts.referredById } : {}),
    },
  })
  await ledgerService.ensureWalletsForUser(user.id)
  return user
}

async function attribute(userId: string, salesmanId: string) {
  return prisma.salesAttribution.create({
    data: { userId, salesmanId, source: 'SALESMAN_LINK' },
  })
}

async function paymentMethod() {
  return (
    (await prisma.paymentMethod.findFirst({ where: { isActive: true, deletedAt: null } })) ??
    (await prisma.paymentMethod.create({
      data: {
        name: `Net Method ${randomUUID().slice(0, 6)}`,
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
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'CANCELLED',
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
      idempotencyKey: `net-dep-${randomUUID()}`,
    },
  })
}

async function addWithdrawal(
  userId: string,
  amount: string,
  status: 'PAID' | 'COMPLETED' | 'PENDING' | 'REJECTED' | 'CANCELLED',
  netAmount?: string,
) {
  const wallet = await prisma.wallet.findFirstOrThrow({
    where: { userId, kind: 'INVESTMENT' },
  })
  const payout = await prisma.payoutMethod.create({
    data: {
      userId,
      label: 'QA payout',
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
      destinationLabel: 'QA payout',
      destinationSnapshot: { address: 'TQA' },
      status,
      idempotencyKey: `net-wd-${randomUUID()}`,
    },
  })
}

async function promoteAdmin(email: string, role: 'SUPER_ADMIN' | 'ADMIN' = 'SUPER_ADMIN') {
  const user = await prisma.user.findFirstOrThrow({ where: { email } })
  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      role,
      staffRole: role,
    },
  })
}

async function registerAndLoginInvestor() {
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
  return { agent, email, password }
}

describe('Salesman network reporting (read-only)', () => {
  beforeAll(async () => {
    await ensureSystemAccounts()
  })
  it('builds A/B hierarchies, filters statuses, and isolates salesmen', async () => {
    const a = await createSalesman()
    const b = await createSalesman()

    const u1 = await createInvestor({ firstName: 'User', lastName: 'One' })
    const u2 = await createInvestor({ firstName: 'User', lastName: 'Two', referredById: u1.id })
    const u3 = await createInvestor({ firstName: 'User', lastName: 'Three', referredById: u2.id })
    const u4 = await createInvestor({ firstName: 'User', lastName: 'Four' })
    const u5 = await createInvestor({ firstName: 'User', lastName: 'Five', referredById: u4.id })
    await attribute(u1.id, a.salesman.id)
    await attribute(u4.id, b.salesman.id)

    await addDeposit(u1.id, '9999', 'APPROVED', '1000')
    await addDeposit(u1.id, '5000', 'PENDING')
    await addDeposit(u1.id, '4000', 'REJECTED')
    await addWithdrawal(u1.id, '999', 'PAID', '100')
    await addWithdrawal(u1.id, '800', 'PENDING')
    await addWithdrawal(u1.id, '700', 'REJECTED')

    await addDeposit(u2.id, '2000', 'APPROVED')
    await addWithdrawal(u2.id, '200', 'COMPLETED')

    await addDeposit(u3.id, '3000', 'APPROVED')
    await addWithdrawal(u3.id, '300', 'PAID')

    await addDeposit(u4.id, '111', 'APPROVED')
    await addWithdrawal(u4.id, '11', 'PAID')
    await addDeposit(u5.id, '222', 'APPROVED')
    await addWithdrawal(u5.id, '22', 'PAID')

    const agentA = await loginSales(a.salesman.email, a.password)
    const network = await agentA.get('/api/v1/sales/me/network')
    expect(network.status).toBe(200)
    expect(network.body.data.summary).toMatchObject({
      totalMembers: 3,
      directMembers: 1,
      maxDepth: 2,
      totalApprovedDeposits: '6000.00',
      totalPaidWithdrawals: '600.00',
      netFunds: '5400.00',
    })
    const idsA = network.body.data.members.map((m: { userId: string }) => m.userId)
    expect(idsA).toEqual([u1.id, u2.id, u3.id])
    expect(idsA).not.toContain(u4.id)
    expect(idsA).not.toContain(u5.id)
    expect(network.body.data.members[0]).toMatchObject({
      userId: u1.id,
      parentUserId: null,
      level: 0,
      isDirect: true,
      approvedDeposits: '1000.00',
      paidWithdrawals: '100.00',
      netFunds: '900.00',
    })
    expect(network.body.data.members[1]).toMatchObject({
      userId: u2.id,
      parentUserId: u1.id,
      level: 1,
      isDirect: false,
    })
    expect(network.body.data.members[2]).toMatchObject({
      userId: u3.id,
      parentUserId: u2.id,
      level: 2,
    })
    expect(JSON.stringify(network.body)).not.toMatch(/passwordHash|refreshToken/)

    const summary = await agentA.get('/api/v1/sales/me/network/summary')
    expect(summary.status).toBe(200)
    expect(summary.body.data.summary.netFunds).toBe('5400.00')

    const members = await agentA.get('/api/v1/sales/me/network/members')
    expect(members.status).toBe(200)
    expect(members.body.data.members).toHaveLength(3)

    const sneak = await agentA.get(`/api/v1/sales/me/network?salesmanId=${b.salesman.id}`)
    expect(sneak.status).toBe(200)
    expect(sneak.body.data.members.map((m: { userId: string }) => m.userId)).toEqual([
      u1.id,
      u2.id,
      u3.id,
    ])

    const ownerAsSales = await agentA.get(`/api/v1/sales/owner/salesmen/${b.salesman.id}/network`)
    expect(ownerAsSales.status).toBe(401)

    const agentB = await loginSales(b.salesman.email, b.password)
    const networkB = await agentB.get('/api/v1/sales/me/network')
    expect(networkB.status).toBe(200)
    expect(networkB.body.data.summary.totalMembers).toBe(2)
    expect(networkB.body.data.members.map((m: { userId: string }) => m.userId)).toEqual([
      u4.id,
      u5.id,
    ])

    const finance = await batchUserFinance([u1.id, u2.id, u3.id])
    const adminDeposits = ['1000.00', '2000.00', '3000.00']
    const adminWithdrawals = ['100.00', '200.00', '300.00']
    expect(finance.get(u1.id)?.totalDeposited).toBe(adminDeposits[0])
    expect(finance.get(u2.id)?.totalDeposited).toBe(adminDeposits[1])
    expect(finance.get(u3.id)?.totalDeposited).toBe(adminDeposits[2])
    expect(finance.get(u1.id)?.totalWithdrawn).toBe(adminWithdrawals[0])
    expect(finance.get(u2.id)?.totalWithdrawn).toBe(adminWithdrawals[1])
    expect(finance.get(u3.id)?.totalWithdrawn).toBe(adminWithdrawals[2])
    expect(network.body.data.members[0].approvedDeposits).toBe(finance.get(u1.id)?.totalDeposited)
    expect(network.body.data.members[0].paidWithdrawals).toBe(finance.get(u1.id)?.totalWithdrawn)
  })

  it('does not expand into another salesman attributed root', async () => {
    const a = await createSalesman()
    const b = await createSalesman()
    const aRoot = await createInvestor({ firstName: 'A', lastName: 'Root' })
    const bRoot = await createInvestor({
      firstName: 'B',
      lastName: 'Root',
      referredById: aRoot.id,
    })
    const bChild = await createInvestor({
      firstName: 'B',
      lastName: 'Child',
      referredById: bRoot.id,
    })
    await attribute(aRoot.id, a.salesman.id)
    await attribute(bRoot.id, b.salesman.id)
    const agentA = await loginSales(a.salesman.email, a.password)
    const res = await agentA.get('/api/v1/sales/me/network')
    expect(res.status).toBe(200)
    const ids = res.body.data.members.map((m: { userId: string }) => m.userId)
    expect(ids).toEqual([aRoot.id])
    expect(ids).not.toContain(bRoot.id)
    expect(ids).not.toContain(bChild.id)
  })

  it('stops cycles in referredById chains', async () => {
    const a = await createSalesman()
    const u1 = await createInvestor({ firstName: 'Cycle', lastName: 'One' })
    const u2 = await createInvestor({ firstName: 'Cycle', lastName: 'Two', referredById: u1.id })
    await prisma.user.update({ where: { id: u1.id }, data: { referredById: u2.id } })
    await attribute(u1.id, a.salesman.id)
    const agentA = await loginSales(a.salesman.email, a.password)
    const res = await agentA.get('/api/v1/sales/me/network')
    expect(res.status).toBe(200)
    const ids = res.body.data.members.map((m: { userId: string }) => m.userId)
    expect(ids).toContain(u1.id)
    expect(ids).toContain(u2.id)
    expect(ids).toHaveLength(2)
  })

  it('admin and super admin can read owner endpoints; investors cannot', async () => {
    const a = await createSalesman()
    const root = await createInvestor({ firstName: 'Own', lastName: 'Root' })
    await attribute(root.id, a.salesman.id)

    const superAdmin = await registerAndLoginInvestor()
    await promoteAdmin(superAdmin.email, 'SUPER_ADMIN')
    const superAgent = request.agent(app)
    const superLogin = await superAgent
      .post('/api/v1/auth/login')
      .send({ email: superAdmin.email, password: superAdmin.password })
    expect(superLogin.status).toBe(200)
    const list = await superAgent.get('/api/v1/sales/owner/salesmen')
    expect(list.status).toBe(200)
    expect(list.body.data.salesmen.some((s: { id: string }) => s.id === a.salesman.id)).toBe(true)
    expect(JSON.stringify(list.body)).not.toMatch(/passwordHash/)

    const ownerNet = await superAgent.get(`/api/v1/sales/owner/salesmen/${a.salesman.id}/network`)
    expect(ownerNet.status).toBe(200)
    expect(ownerNet.body.data.members[0].userId).toBe(root.id)

    const admin = await registerAndLoginInvestor()
    await promoteAdmin(admin.email, 'ADMIN')
    const adminAgent = request.agent(app)
    const adminLogin = await adminAgent
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: admin.password })
    expect(adminLogin.status).toBe(200)
    const adminNet = await adminAgent.get(
      `/api/v1/sales/owner/salesmen/${a.salesman.id}/network/summary`,
    )
    expect(adminNet.status).toBe(200)

    const investor = await registerAndLoginInvestor()
    const invNet = await investor.agent.get('/api/v1/sales/me/network')
    expect(invNet.status).toBe(401)
    const invOwner = await investor.agent.get(`/api/v1/sales/owner/salesmen/${a.salesman.id}/network`)
    expect(invOwner.status).toBe(403)

    const missing = await superAgent.get(`/api/v1/sales/owner/salesmen/${randomUUID()}/network`)
    expect(missing.status).toBe(404)
  })

  it('rejects POST mutations on network routes', async () => {
    const a = await createSalesman()
    const agent = await loginSales(a.salesman.email, a.password)
    const post = await agent.post('/api/v1/sales/me/network').send({})
    expect([404, 405]).toContain(post.status)
  })

  it('stops walking referredById after depth 32 and names tree parents', async () => {
    const a = await createSalesman()
    const chain: string[] = []
    let parentId: string | undefined
    for (let i = 0; i < 34; i += 1) {
      const user = await createInvestor({
        firstName: `D${i}`,
        lastName: 'Node',
        referredById: parentId,
      })
      chain.push(user.id)
      parentId = user.id
    }
    await attribute(chain[0]!, a.salesman.id)
    const agentA = await loginSales(a.salesman.email, a.password)
    const res = await agentA.get('/api/v1/sales/me/network')
    expect(res.status).toBe(200)
    const members = res.body.data.members as Array<{
      userId: string
      level: number
      parentName: string | null
    }>
    expect(members).toHaveLength(33)
    expect(res.body.data.summary.maxDepth).toBe(32)
    expect(members.map((row) => row.userId)).not.toContain(chain[33])
    expect(members[0]?.parentName).toBeNull()
    expect(members[1]?.parentName).toBe('D0 Node')
    expect(members[32]?.level).toBe(32)
  })

  it('returns currency on customer deposit and withdrawal history', async () => {
    const a = await createSalesman()
    const root = await createInvestor({ firstName: 'Cash', lastName: 'Root' })
    await attribute(root.id, a.salesman.id)
    await addDeposit(root.id, '50', 'APPROVED')
    await addWithdrawal(root.id, '10', 'PAID')
    const agentA = await loginSales(a.salesman.email, a.password)
    const detail = await agentA.get(`/api/v1/sales/me/network/members/${root.id}`)
    expect(detail.status).toBe(200)
    expect(detail.body.data.depositHistory[0]).toMatchObject({
      currency: 'USD',
      status: 'APPROVED',
    })
    expect(detail.body.data.withdrawalHistory[0]).toMatchObject({
      currency: 'USD',
      status: 'PAID',
    })
  })

  it('allows HEAD on salesman network routes', async () => {
    const a = await createSalesman()
    const agent = await loginSales(a.salesman.email, a.password)
    const head = await agent.head('/api/v1/sales/me/network')
    expect(head.status).toBe(200)
  })
})
