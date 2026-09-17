import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'

const app = createApp()

async function loginAsSuperAdmin() {
  const email = `health_${randomUUID().slice(0, 8)}@example.com`
  const password = 'SecurePass1!'
  await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    firstName: 'Health',
    lastName: 'Ops',
    acceptTerms: true,
    acceptRisk: true,
  })
  const { prisma } = await import('../../src/database/prisma.js')
  const user = await prisma.user.findFirst({ where: { email } })
  await prisma.user.update({
    where: { id: user!.id },
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
  return agent
}

describe('Production monitoring — GET /admin/health', () => {
  it('returns real widget metrics for operators', async () => {
    const agent = await loginAsSuperAdmin()
    const res = await agent.get('/api/v1/admin/health')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const data = res.body.data
    expect(data.version).toMatch(/Wealthora API/)
    expect(data.refreshedAt).toBeTruthy()
    expect(Array.isArray(data.metrics)).toBe(true)

    const ids = data.metrics.map((m: { id: string }) => m.id)
    for (const required of [
      'api',
      'database',
      'redis',
      'queue',
      'storage',
      'email-queue',
      'failed-jobs',
      'cpu',
      'memory',
      'visitors',
      'active-users',
      'deposits-today',
      'withdrawals-today',
      'kyc-pending',
      'failed-payments',
      'system-logs',
      'audit-logs',
      'error-logs',
    ]) {
      expect(ids).toContain(required)
    }

    expect(data.widgets.database.status).toMatch(/up|down/)
    expect(data.widgets.redis.status).toMatch(/up|down|disabled/)
    expect(data.widgets.storage.status).toMatch(/up|down|disabled/)
    expect(typeof data.widgets.cpu.load1).toBe('number')
    expect(typeof data.widgets.memory.processRssMb).toBe('number')
    expect(typeof data.widgets.depositsToday.count).toBe('number')
    expect(typeof data.widgets.kycPending.count).toBe('number')
    expect(data.logs).toBeTruthy()
    expect(Array.isArray(data.logs.system)).toBe(true)
    expect(Array.isArray(data.logs.audit)).toBe(true)
    expect(Array.isArray(data.logs.errors)).toBe(true)
  })

  it('blocks investors from admin health', async () => {
    const email = `health_inv_${randomUUID().slice(0, 8)}@example.com`
    const password = 'SecurePass1!'
    await request(app).post('/api/v1/auth/register').send({
      email,
      password,
      firstName: 'Inv',
      lastName: 'User',
      acceptTerms: true,
      acceptRisk: true,
    })
    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.updateMany({
      where: { email },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    })
    const agent = request.agent(app)
    await agent.post('/api/v1/auth/login').send({ email, password })
    const res = await agent.get('/api/v1/admin/health')
    expect(res.status).toBe(403)
  })
})
