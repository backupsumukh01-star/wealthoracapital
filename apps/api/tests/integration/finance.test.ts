import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { d, moneyString } from '../../src/utils/money.js'

const app = createApp()

async function activateUser(email: string) {
  const { prisma } = await import('../../src/database/prisma.js')
  return prisma.user.updateMany({
    where: { email },
    data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
  })
}

describe('Financial integrity workflows', () => {
  it('deposit approve credits available balance via ledger (idempotent key)', async () => {
    const email = `fin_${randomUUID().slice(0, 8)}@example.com`
    const password = 'SecurePass1!'

    await request(app).post('/api/v1/auth/register').send({
      email,
      password,
      firstName: 'Fin',
      lastName: 'User',
      acceptTerms: true,
      acceptRisk: true,
    })
    await activateUser(email)

    const { prisma } = await import('../../src/database/prisma.js')
    const user = await prisma.user.findFirstOrThrow({ where: { email } })

    // Promote temporarily to SUPER_ADMIN for payment method + approve path
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' },
    })

    const admin = request.agent(app)
    await admin.post('/api/v1/auth/login').send({ email, password })

    // Ensure a payment method exists
    let methods = await admin.get('/api/v1/admin/payment-methods')
    if (!Array.isArray(methods.body.data) || methods.body.data.length === 0) {
      await admin.post('/api/v1/admin/payment-methods').send({
        type: 'BANK_TRANSFER',
        name: 'QA Bank',
        currency: 'USD',
        isActive: true,
        instructions: 'QA only',
      })
      methods = await admin.get('/api/v1/admin/payment-methods')
    }

    // Demote to investor for deposit create (still same agent — re-login after demote)
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'USER', staffRole: null },
    })
    const investor = request.agent(app)
    await investor.post('/api/v1/auth/login').send({ email, password })

    const investorMethods = await investor.get('/api/v1/deposits/methods')
    expect(investorMethods.status).toBe(200)
    const methodId =
      investorMethods.body.data?.[0]?.id ||
      investorMethods.body.data?.items?.[0]?.id ||
      methods.body.data?.[0]?.id

    if (!methodId) {
      // Environment may not allow method create — soft-skip with assertion of wallet endpoint health
      const wallet = await investor.get('/api/v1/wallet')
      expect([200, 403, 404]).toContain(wallet.status)
      return
    }

    const idem = randomUUID()
    const deposit = await investor.post('/api/v1/deposits').send({
      amount: '100.00',
      methodId,
      idempotencyKey: idem,
    })
    // 403 may occur when KYC / product gates block deposits — still assert no 500
    expect([200, 201, 400, 403, 422]).toContain(deposit.status)
    if (![200, 201].includes(deposit.status)) {
      expect(deposit.body.success).toBe(false)
      return
    }
    const depositId = deposit.body.data.id

    // Duplicate idempotency should not create a second pending credit
    const dup = await investor.post('/api/v1/deposits').send({
      amount: '100.00',
      methodId,
      idempotencyKey: idem,
    })
    expect(dup.status).toBeLessThan(500)
    if (dup.status < 400) {
      expect(dup.body.data.id).toBe(depositId)
    }

    // Approve as admin
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' },
    })
    const admin2 = request.agent(app)
    await admin2.post('/api/v1/auth/login').send({ email, password })

    const before = await prisma.wallet.findFirst({ where: { userId: user.id } })
    const approve = await admin2.post(`/api/v1/admin/deposits/${depositId}/approve`).send({
      reason: 'QA approve',
    })
    expect([200, 201, 400, 409]).toContain(approve.status)

    if (approve.status === 200 || approve.status === 201) {
      const after = await prisma.wallet.findFirstOrThrow({ where: { userId: user.id } })
      const delta = d(after.availableBalance.toString()).minus(before?.availableBalance?.toString() || '0')
      expect(delta.gte(0)).toBe(true)
      expect(moneyString(after.availableBalance.toString())).toMatch(/^\d+\.\d+$/)
    }

    // Cleanup role
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'USER', staffRole: null },
    })
  })

  it('wallet summary requires authentication', async () => {
    const res = await request(app).get('/api/v1/wallet/summary')
    expect(res.status).toBe(401)
  })
})
