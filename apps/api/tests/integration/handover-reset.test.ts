import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { HANDOVER_CONFIRM_PHRASE } from '../../src/validators/handover.validators.js'

const app = createApp()

async function prismaClient() {
  const { prisma } = await import('../../src/database/prisma.js')
  return prisma
}

async function registerActive(email: string, password = 'SecurePass1!') {
  await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    firstName: 'Handover',
    lastName: 'Test',
    acceptTerms: true,
    acceptRisk: true,
  })
  const prisma = await prismaClient()
  const user = await prisma.user.findFirst({ where: { email } })
  await prisma.user.update({
    where: { id: user!.id },
    data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
  })
  return user!.id
}

async function promoteToSuperAdmin(userId: string) {
  const prisma = await prismaClient()
  await prisma.user.update({
    where: { id: userId },
    data: { role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' },
  })
}

async function loginAgent(email: string, password = 'SecurePass1!') {
  const agent = request.agent(app)
  const login = await agent.post('/api/v1/auth/login').send({ email, password })
  expect(login.status).toBe(200)
  const csrf = login.body.data.csrfToken as string
  return { agent, csrf }
}

async function ensurePublishedDailyReturns() {
  const prisma = await prismaClient()
  const existing = await prisma.dailyReturn.count({
    where: { status: { in: ['PUBLISHED', 'DISTRIBUTED'] } },
  })
  if (existing > 0) return

  await prisma.dailyReturn.createMany({
    data: [
      {
        date: new Date('2035-01-05'),
        status: 'PUBLISHED',
      },
      {
        date: new Date('2035-02-05'),
        status: 'PUBLISHED',
      },
      {
        date: new Date('2035-03-05'),
        status: 'DISTRIBUTED',
      },
    ],
    skipDuplicates: true,
  })
}

async function createResetFixture() {
  const prisma = await prismaClient()
  const adminEmail = `ho_admin_${randomUUID().slice(0, 8)}@example.com`
  const customerEmail = `ho_customer_${randomUUID().slice(0, 8)}@example.com`
  const staffEmail = `ho_staff_${randomUUID().slice(0, 8)}@example.com`

  const adminId = await registerActive(adminEmail)
  const customerId = await registerActive(customerEmail)
  const staffId = await registerActive(staffEmail)

  await promoteToSuperAdmin(adminId)
  await prisma.user.update({
    where: { id: staffId },
    data: { role: 'ADMIN', staffRole: 'SUPPORT' },
  })

  await prisma.wallet.create({
    data: {
      userId: customerId,
      kind: 'INVESTMENT',
      balance: 100,
      availableBalance: 100,
      totalDeposited: 100,
    },
  })

  const { agent, csrf } = await loginAgent(adminEmail)
  return { prisma, adminId, adminEmail, customerId, customerEmail, staffId, staffEmail, agent, csrf }
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
    const prisma = await prismaClient()
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

  it('allows admin to preview counts and returns a non-empty historical period label', async () => {
    await ensurePublishedDailyReturns()
    const email = `ho_adm_${randomUUID().slice(0, 8)}@example.com`
    const id = await registerActive(email)
    await promoteToSuperAdmin(id)

    const prisma = await prismaClient()
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
    expect(res.body.data.preserve.historicalPeriodLabel).toBeTruthy()
    expect(res.body.data.preserve.historicalPeriodLabel).not.toContain('—')
    expect(res.body.data.preserve.historicalPeriodLabel).not.toBe('No published performance yet')
    expect(res.body.data.actorPreserved).toBe(true)

    const afterDays = await prisma.dailyReturn.count({
      where: { status: { in: ['PUBLISHED', 'DISTRIBUTED'] } },
    })
    expect(afterDays).toBe(beforeDays)
  })

  it('rejects reset without backup acknowledgement, confirmation phrase, or confirm flag', async () => {
    const email = `ho_bad_${randomUUID().slice(0, 8)}@example.com`
    const id = await registerActive(email)
    await promoteToSuperAdmin(id)
    const { agent, csrf } = await loginAgent(email)

    const missingConfirm = await agent
      .post('/api/v1/admin/handover/reset')
      .set('x-csrf-token', csrf)
      .send({
        mode: 'TEST_DATA_RESET',
        confirmationPhrase: HANDOVER_CONFIRM_PHRASE,
      })
    expect(missingConfirm.status).toBe(400)

    const missingBackup = await agent
      .post('/api/v1/admin/handover/reset')
      .set('x-csrf-token', csrf)
      .send({
        mode: 'TEST_DATA_RESET',
        confirmationPhrase: HANDOVER_CONFIRM_PHRASE,
        confirm: true,
      })
    expect(missingBackup.status).toBe(400)

    const badPhrase = await agent
      .post('/api/v1/admin/handover/reset')
      .set('x-csrf-token', csrf)
      .send({
        mode: 'TEST_DATA_RESET',
        confirmationPhrase: 'WRONG PHRASE',
        confirm: true,
        backupAcknowledged: true,
      })
    expect(badPhrase.status).toBe(400)
  })

  it('resets operational data, preserves staff/history, and returns verification details', async () => {
    await ensurePublishedDailyReturns()
    const { prisma, adminId, customerId, staffId, agent, csrf } = await createResetFixture()

    const beforeDays = await prisma.dailyReturn.count({
      where: { status: { in: ['PUBLISHED', 'DISTRIBUTED'] } },
    })
    const beforeTrades = await prisma.trade.count({
      where: { isPublic: true, status: 'CLOSED' },
    })
    const beforeCms = await prisma.cmsDocument.count()
    const beforeSettings = await prisma.platformSetting.count()
    const beforeMethods = await prisma.paymentMethod.count()

    const preview = await agent
      .post('/api/v1/admin/handover/reset/preview')
      .set('x-csrf-token', csrf)
      .send({ mode: 'TEST_DATA_RESET' })
    expect(preview.status).toBe(200)
    expect(preview.body.data.remove.users).toBeGreaterThanOrEqual(1)
    expect(preview.body.data.remove.balances).toBeGreaterThanOrEqual(1)

    const reset = await agent
      .post('/api/v1/admin/handover/reset')
      .set('x-csrf-token', csrf)
      .send({
        mode: 'TEST_DATA_RESET',
        confirmationPhrase: HANDOVER_CONFIRM_PHRASE,
        confirm: true,
        backupAcknowledged: true,
      })

    expect(reset.status).toBe(200)
    expect(reset.body.data.message).toMatch(/completed/i)
    expect(reset.body.data.alreadyClean).toBe(false)
    expect(reset.body.data.backupPath).toBeTruthy()
    expect(reset.body.data.after.users).toBe(0)
    expect(reset.body.data.after.wallets).toBe(0)
    expect(reset.body.data.historicalPerformance.tradingDays).toBe(beforeDays)
    expect(reset.body.data.historicalPerformance.trades).toBe(beforeTrades)
    expect(reset.body.data.historicalPerformance.periodLabel).toBeTruthy()
    expect(reset.body.data.verification.customerCountsZero).toBe(true)
    expect(reset.body.data.verification.orphanFinanceFksZero).toBe(true)
    expect(reset.body.data.verification.actorStillPrivileged).toBe(true)
    expect(reset.body.data.verification.staffUsersRemaining).toBeGreaterThanOrEqual(1)
    expect(reset.body.data.verification.historicalTradesUnchanged).toBe(true)
    expect(reset.body.data.verification.historicalDailyReturnsUnchanged).toBe(true)
    expect(reset.body.data.verification.cmsDocumentsPreserved).toBe(true)
    expect(reset.body.data.verification.platformSettingsPreserved).toBe(true)
    expect(reset.body.data.verification.paymentMethodsPreserved).toBe(true)

    const customerGone = await prisma.user.findUnique({ where: { id: customerId } })
    expect(customerGone).toBeNull()

    const adminStill = await prisma.user.findUnique({ where: { id: adminId } })
    expect(adminStill).toBeTruthy()

    const staffStill = await prisma.user.findUnique({ where: { id: staffId } })
    expect(staffStill).toBeTruthy()
    expect(staffStill?.staffRole).toBe('SUPPORT')

    const afterDays = await prisma.dailyReturn.count({
      where: { status: { in: ['PUBLISHED', 'DISTRIBUTED'] } },
    })
    const afterTrades = await prisma.trade.count({
      where: { isPublic: true, status: 'CLOSED' },
    })
    expect(afterDays).toBe(beforeDays)
    expect(afterTrades).toBe(beforeTrades)
    expect(await prisma.cmsDocument.count()).toBe(beforeCms)
    expect(await prisma.platformSetting.count()).toBe(beforeSettings)
    expect(await prisma.paymentMethod.count()).toBe(beforeMethods)

    const secondReset = await agent
      .post('/api/v1/admin/handover/reset')
      .set('x-csrf-token', csrf)
      .send({
        mode: 'TEST_DATA_RESET',
        confirmationPhrase: HANDOVER_CONFIRM_PHRASE,
        confirm: true,
        backupAcknowledged: true,
      })

    expect(secondReset.status).toBe(200)
    expect(secondReset.body.data.alreadyClean).toBe(true)
    expect(secondReset.body.data.message).toBe(
      'No customer/demo data remains. Historical platform data and configuration are preserved.',
    )
    expect(secondReset.body.data.backupPath).toBeNull()

    const successAudit = await prisma.auditLog.findFirst({
      where: { action: 'Client handover reset executed' },
      orderBy: { createdAt: 'desc' },
    })
    expect(successAudit).toBeTruthy()
    expect(JSON.stringify(successAudit?.newValue ?? {})).not.toMatch(/password|token|secret/i)

    const skippedAudit = await prisma.auditLog.findFirst({
      where: { action: 'Client handover reset skipped' },
      orderBy: { createdAt: 'desc' },
    })
    expect(skippedAudit).toBeTruthy()
  }, 120_000)
})
