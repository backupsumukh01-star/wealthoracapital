import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { prisma } from '../../src/database/prisma.js'

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
    await registerActive(adminEmail, adminPassword)
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
  })
})
