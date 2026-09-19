import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { prisma } from '../../src/database/prisma.js'
import { cache } from '../../src/services/cache/index.js'

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

describe('Admin manual user creation KYC exemption', () => {
  it('approves KYC only for admin-created users, not public registration', async () => {
    const adminEmail = uniqueEmail('adm')
    const adminPassword = 'SecurePass1!'
    const admin = await registerActive(adminEmail, adminPassword)
    const agent = request.agent(app)
    const login = await agent.post('/api/v1/auth/login').send({
      email: adminEmail,
      password: adminPassword,
    })
    expect(login.status).toBe(200)
    const csrf = login.body.data.csrfToken as string

    const createdEmail = uniqueEmail('manual')
    const created = await agent
      .post('/api/v1/admin/users')
      .set('x-csrf-token', csrf)
      .send({
        firstName: 'Manual',
        lastName: 'Investor',
        email: createdEmail,
        password: 'ManualPass1!',
      })
    expect([200, 201]).toContain(created.status)
    const row = await prisma.user.findFirstOrThrow({ where: { email: createdEmail } })
    expect(row.kycStatus).toBe('APPROVED')
    expect(row.emailVerifiedAt).toBeTruthy()
    expect(row.status).toBe('ACTIVE')
    expect(row.role).toBe('USER')
    expect(row.createdByAdminId).toBe(admin.id)

    const titles = await prisma.activityLog.findMany({
      where: { userId: row.id },
      select: { kind: true, title: true },
    })
    expect(titles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'REGISTRATION', title: 'Account created' }),
        expect.objectContaining({ kind: 'KYC_APPROVED', title: 'KYC approved' }),
      ]),
    )
    expect(titles.some((t) => t.title.includes('created by admin'))).toBe(false)
    expect(titles.some((t) => t.title.toLowerCase().includes('historical'))).toBe(false)

    const publicEmail = uniqueEmail('pub')
    const publicReg = await request(app).post('/api/v1/auth/register').send({
      email: publicEmail,
      password: 'SecurePass1!',
      firstName: 'Public',
      lastName: 'User',
      acceptTerms: true,
      acceptRisk: true,
    })
    expect([200, 201]).toContain(publicReg.status)
    const publicUser = await prisma.user.findFirstOrThrow({ where: { email: publicEmail } })
    expect(publicUser.kycStatus).toBe('NOT_STARTED')
    expect(publicUser.emailVerifiedAt).toBeNull()

    const history = await agent
      .post(`/api/v1/admin/users/${row.id}/history`)
      .set('x-csrf-token', csrf)
      .send({
        activity: 'DEPOSIT',
        occurredAt: '2024-01-15T10:00:00.000Z',
        amount: '100.00',
        currency: 'USD',
        note: 'Backfill after admin create',
      })
    expect([200, 201]).toContain(history.status)
    expect(history.body.data.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activity: 'DEPOSIT',
          amount: expect.any(String),
        }),
      ]),
    )

    const afterHistory = await prisma.activityLog.findMany({
      where: { userId: row.id },
      select: { kind: true, title: true, description: true },
    })
    expect(afterHistory.some((t) => t.title.toLowerCase().includes('historical'))).toBe(false)
    expect(afterHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'DEPOSIT_SUBMITTED', title: 'Deposit submitted' }),
        expect.objectContaining({ kind: 'DEPOSIT_APPROVED', title: 'Deposit confirmed by provider' }),
      ]),
    )
    const submitted = afterHistory.find((t) => t.kind === 'DEPOSIT_SUBMITTED')
    expect(submitted?.description).toMatch(/^DEP-[A-Z0-9]+$/)

    const demoDeposit = await prisma.deposit.findFirstOrThrow({ where: { userId: row.id } })
    const adminDeposits = await agent.get('/api/v1/admin/deposits').set('x-csrf-token', csrf)
    expect(adminDeposits.status).toBe(200)
    const listedIds = (adminDeposits.body.data.items as Array<{ id: string }>).map((item) => item.id)
    expect(listedIds).not.toContain(demoDeposit.id)

    const hidden = await agent.get(`/api/v1/admin/deposits/${demoDeposit.id}`).set('x-csrf-token', csrf)
    expect(hidden.status).toBe(404)

    const usersDefault = await agent
      .get(`/api/v1/admin/users?q=${encodeURIComponent(createdEmail)}`)
      .set('x-csrf-token', csrf)
    expect(usersDefault.status).toBe(200)
    const defaultEmails = (usersDefault.body.data.items as Array<{ email: string }>).map((u) => u.email)
    expect(defaultEmails).not.toContain(createdEmail)

    const publicListed = await agent
      .get(`/api/v1/admin/users?q=${encodeURIComponent(publicEmail)}`)
      .set('x-csrf-token', csrf)
    expect(publicListed.status).toBe(200)
    expect((publicListed.body.data.items as Array<{ email: string }>).map((u) => u.email)).toContain(
      publicEmail,
    )

    const usersLookalike = await agent
      .get(`/api/v1/admin/users?lookalike=true&q=${encodeURIComponent(createdEmail)}`)
      .set('x-csrf-token', csrf)
    expect(usersLookalike.status).toBe(200)
    const lookalikeEmails = (usersLookalike.body.data.items as Array<{ email: string; createdByAdminId?: string | null }>).map(
      (u) => u.email,
    )
    expect(lookalikeEmails).toContain(createdEmail)
    expect(lookalikeEmails).not.toContain(publicEmail)

    const lookalikeCount = await prisma.user.count({
      where: { createdByAdminId: { not: null }, role: 'USER', deletedAt: null },
    })
    const realCount = await prisma.user.count({
      where: { createdByAdminId: null, role: 'USER', deletedAt: null },
    })
    expect(lookalikeCount).toBeGreaterThanOrEqual(1)
    await cache.del('admin:dashboard:ops-v5')
    const ops = await agent.get('/api/v1/admin/dashboard/ops').set('x-csrf-token', csrf)
    expect(ops.status).toBe(200)
    const registeredCard = (
      ops.body.data.executiveKpis as Array<{
        cards: Array<{ id: string; value: string }>
      }>
    )
      .flatMap((row) => row.cards)
      .find((card) => card.id === 'total-registered-users')
    expect(registeredCard).toBeTruthy()
    expect(Number(registeredCard?.value)).toBe(realCount)
  })
})
