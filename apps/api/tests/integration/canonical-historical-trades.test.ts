import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { prisma } from '../../src/database/prisma.js'
import { filterCanonicalTrades } from '../../src/services/trading/canonical-demo-trades.js'

const app = createApp()

function uniqueEmail(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}@example.com`
}

async function registerActive(email: string, password = 'SecurePass1!') {
  await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    firstName: 'Admin',
    lastName: 'Creator',
    acceptTerms: true,
    acceptRisk: true,
  })
  const user = await prisma.user.findFirstOrThrow({ where: { email } })
  await prisma.user.update({
    where: { id: user.id },
    data: { status: 'ACTIVE', emailVerifiedAt: new Date(), role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' },
  })
  return user
}

describe('Canonical historical trades for dummy vs real investors', () => {
  it('lets a newly created dummy user see the shared archive from their start date', async () => {
    const adminEmail = uniqueEmail('hist-adm')
    const adminPassword = 'SecurePass1!'
    await registerActive(adminEmail, adminPassword)
    const agent = request.agent(app)
    const login = await agent.post('/api/v1/auth/login').send({
      email: adminEmail,
      password: adminPassword,
    })
    expect(login.status).toBe(200)
    const csrf = login.body.data.csrfToken as string

    const dummyEmail = uniqueEmail('hist-dummy')
    const created = await agent
      .post('/api/v1/admin/users')
      .set('x-csrf-token', csrf)
      .send({
        firstName: 'Dummy',
        lastName: 'Investor',
        email: dummyEmail,
        password: 'DummyPass1!',
        accountOpened: '2026-01-01T00:00:00.000Z',
      })
    expect([200, 201]).toContain(created.status)

    const dummyLogin = request.agent(app)
    const dummyAuth = await dummyLogin.post('/api/v1/auth/login').send({
      email: dummyEmail,
      password: 'DummyPass1!',
    })
    expect(dummyAuth.status).toBe(200)

    const trades = await dummyLogin.get('/api/v1/trades')
    expect(trades.status).toBe(200)
    const items = trades.body.data.items as Array<{ date: string; id: string; pair: string }>
    expect(items.length).toBeGreaterThan(10)
    expect(items.every((t) => t.date >= '2026-01-01')).toBe(true)
    const expected = filterCanonicalTrades({ fromDate: '2026-01-01' }).slice().sort((a, b) => {
      const date = String(b.tradeDate).localeCompare(String(a.tradeDate))
      if (date) return date
      return String(b.closeTime ?? '').localeCompare(String(a.closeTime ?? ''))
    })
    expect(items.length).toBe(expected.length)
    expect(items[0]?.id).toBe(expected[0]?.id)

    const stats = await dummyLogin.get('/api/v1/trades/stats')
    expect(stats.status).toBe(200)
    expect(stats.body.data.tradeCount).toBe(expected.length)
  })

  it('does not attach a private copy of the archive and leaves real-user listing unscoped', async () => {
    const realEmail = uniqueEmail('hist-real')
    await request(app).post('/api/v1/auth/register').send({
      email: realEmail,
      password: 'SecurePass1!',
      firstName: 'Real',
      lastName: 'Investor',
      acceptTerms: true,
      acceptRisk: true,
    })
    await prisma.user.updateMany({
      where: { email: realEmail },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    })
    const realAgent = request.agent(app)
    const login = await realAgent.post('/api/v1/auth/login').send({
      email: realEmail,
      password: 'SecurePass1!',
    })
    expect(login.status).toBe(200)

    const trades = await realAgent.get('/api/v1/trades')
    expect(trades.status).toBe(200)
    const items = trades.body.data.items as Array<{ date: string }>
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThanOrEqual(50)
    const publicTrades = await request(app).get('/api/v1/trades/public?limit=20')
    expect(publicTrades.status).toBe(200)
    expect(publicTrades.body.data.items[0].id).toBe(trades.body.data.items[0].id)
  })
})
