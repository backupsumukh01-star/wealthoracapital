import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { HANDOVER_CONFIRM_PHRASE } from '../../src/validators/handover.validators.js'

const app = createApp()

async function registerActive(email: string, password = 'SecurePass1!') {
  await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    firstName: 'Handover',
    lastName: 'Test',
    acceptTerms: true,
    acceptRisk: true,
  })
  const { prisma } = await import('../../src/database/prisma.js')
  const user = await prisma.user.findFirst({ where: { email } })
  await prisma.user.update({
    where: { id: user!.id },
    data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
  })
  return user!.id
}

async function loginAgent(email: string, password = 'SecurePass1!') {
  const agent = request.agent(app)
  const login = await agent.post('/api/v1/auth/login').send({ email, password })
  expect(login.status).toBe(200)
  const csrf = login.body.data.csrfToken as string
  return { agent, csrf }
}

describe('Client handover reset', () => {
  it('rejects unauthenticated preview', async () => {
    const res = await request(app)
      .post('/api/v1/admin/handover/reset/preview')
      .send({ mode: 'TEST_DATA_RESET' })
    expect(res.status).toBe(401)
  })

  it('rejects normal investors', async () => {
    const email = `ho_inv_${randomUUID().slice(0, 8)}@example.com`
    await registerActive(email)
    const { agent, csrf } = await loginAgent(email)
    const res = await agent
      .post('/api/v1/admin/handover/reset/preview')
      .set('x-csrf-token', csrf)
      .send({ mode: 'TEST_DATA_RESET' })
    expect(res.status).toBe(403)
  })

  it('rejects scoped staff without settings.handover (FINANCE)', async () => {
    const email = `ho_fin_${randomUUID().slice(0, 8)}@example.com`
    const id = await registerActive(email)
    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.update({
      where: { id },
      data: { role: 'ADMIN', staffRole: 'FINANCE' },
    })
    const { agent, csrf } = await loginAgent(email)
    const res = await agent
      .post('/api/v1/admin/handover/reset/preview')
      .set('x-csrf-token', csrf)
      .send({ mode: 'TEST_DATA_RESET' })
    expect(res.status).toBe(403)
  })

  it('allows admin to preview counts without deleting', async () => {
    const email = `ho_adm_${randomUUID().slice(0, 8)}@example.com`
    const id = await registerActive(email)
    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.update({
      where: { id },
      data: { role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' },
    })

    const beforeDays = await prisma.dailyReturn.count({
      where: { status: { in: ['PUBLISHED', 'DISTRIBUTED'] } },
    })
    const beforeTrades = await prisma.trade.count({
      where: { isPublic: true, status: 'CLOSED' },
    })

    const { agent, csrf } = await loginAgent(email)
    const res = await agent
      .post('/api/v1/admin/handover/reset/preview')
      .set('x-csrf-token', csrf)
      .send({ mode: 'TEST_DATA_RESET' })

    expect(res.status).toBe(200)
    expect(res.body.data.remove).toBeTruthy()
    expect(typeof res.body.data.remove.users).toBe('number')
    expect(res.body.data.preserve.historicalDailyReturns).toBe(beforeDays)
    expect(res.body.data.preserve.historicalTrades).toBe(beforeTrades)
    expect(res.body.data.actorPreserved).toBe(true)

    const afterDays = await prisma.dailyReturn.count({
      where: { status: { in: ['PUBLISHED', 'DISTRIBUTED'] } },
    })
    expect(afterDays).toBe(beforeDays)
  })

  it('rejects reset without confirmation phrase / confirm flag', async () => {
    const email = `ho_bad_${randomUUID().slice(0, 8)}@example.com`
    const id = await registerActive(email)
    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.update({
      where: { id },
      data: { role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' },
    })
    const { agent, csrf } = await loginAgent(email)

    const missingConfirm = await agent
      .post('/api/v1/admin/handover/reset')
      .set('x-csrf-token', csrf)
      .send({
        mode: 'TEST_DATA_RESET',
        confirmationPhrase: HANDOVER_CONFIRM_PHRASE,
      })
    expect(missingConfirm.status).toBe(400)

    const badPhrase = await agent
      .post('/api/v1/admin/handover/reset')
      .set('x-csrf-token', csrf)
      .send({
        mode: 'TEST_DATA_RESET',
        confirmationPhrase: 'WRONG PHRASE',
        confirm: true,
      })
    expect(badPhrase.status).toBe(400)
  })

  it('resets operational data while preserving historical performance and admin', async () => {
    const adminEmail = `ho_run_${randomUUID().slice(0, 8)}@example.com`
    const customerEmail = `ho_cust_${randomUUID().slice(0, 8)}@example.com`
    const adminId = await registerActive(adminEmail)
    const customerId = await registerActive(customerEmail)
    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.update({
      where: { id: adminId },
      data: { role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' },
    })

    // Minimal wallet for the customer so reset has something to remove.
    await prisma.wallet.create({
      data: {
        userId: customerId,
        kind: 'INVESTMENT',
        balance: 100,
        availableBalance: 100,
      },
    })

    const beforeDays = await prisma.dailyReturn.count({
      where: { status: { in: ['PUBLISHED', 'DISTRIBUTED'] } },
    })
    const beforeTrades = await prisma.trade.count({
      where: { isPublic: true, status: 'CLOSED' },
    })

    const { agent, csrf } = await loginAgent(adminEmail)
    const preview = await agent
      .post('/api/v1/admin/handover/reset/preview')
      .set('x-csrf-token', csrf)
      .send({ mode: 'TEST_DATA_RESET' })
    expect(preview.status).toBe(200)
    expect(preview.body.data.remove.users).toBeGreaterThanOrEqual(1)

    const reset = await agent
      .post('/api/v1/admin/handover/reset')
      .set('x-csrf-token', csrf)
      .send({
        mode: 'TEST_DATA_RESET',
        confirmationPhrase: HANDOVER_CONFIRM_PHRASE,
        confirm: true,
      })
    expect(reset.status).toBe(200)
    expect(reset.body.data.message).toMatch(/completed/i)
    expect(reset.body.data.historicalPerformance.tradingDays).toBe(beforeDays)
    expect(reset.body.data.historicalPerformance.trades).toBe(beforeTrades)

    const customerGone = await prisma.user.findUnique({ where: { id: customerId } })
    expect(customerGone).toBeNull()

    const adminStill = await prisma.user.findUnique({ where: { id: adminId } })
    expect(adminStill).toBeTruthy()

    const afterDays = await prisma.dailyReturn.count({
      where: { status: { in: ['PUBLISHED', 'DISTRIBUTED'] } },
    })
    const afterTrades = await prisma.trade.count({
      where: { isPublic: true, status: 'CLOSED' },
    })
    expect(afterDays).toBe(beforeDays)
    expect(afterTrades).toBe(beforeTrades)

    // New registration starts clean (zero wallets until ensureWallets).
    const freshEmail = `ho_new_${randomUUID().slice(0, 8)}@example.com`
    const freshId = await registerActive(freshEmail)
    const wallets = await prisma.wallet.findMany({ where: { userId: freshId } })
    const balanceSum = wallets.reduce((acc, w) => acc + Number(w.balance), 0)
    expect(balanceSum).toBe(0)

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'Client handover reset executed' },
      orderBy: { createdAt: 'desc' },
    })
    expect(audit).toBeTruthy()
    expect(JSON.stringify(audit?.newValue ?? {})).not.toMatch(/password/i)
  }, 120_000)
})
