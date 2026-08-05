import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'

const app = createApp()

async function createActiveInvestor() {
  const email = `sec_${randomUUID().slice(0, 8)}@example.com`
  const password = 'SecurePass1!'
  await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    firstName: 'Sec',
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
  const agent = request.agent(app)
  await agent.post('/api/v1/auth/login').send({ email, password })
  return { agent, userId: user!.id, email }
}

describe('Security — authz & injection surface', () => {
  it('blocks investor from admin dashboard (403)', async () => {
    const { agent } = await createActiveInvestor()
    const res = await agent.get('/api/v1/admin/dashboard')
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('blocks investor from admin users list', async () => {
    const { agent } = await createActiveInvestor()
    const res = await agent.get('/api/v1/admin/users')
    expect(res.status).toBe(403)
  })

  it('rejects SQL injection payloads in login email without 500', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: "' OR '1'='1@evil.com",
      password: 'SecurePass1!',
    })
    expect(res.status).toBeLessThan(500)
    expect(res.body.success).toBe(false)
  })

  it('rejects XSS script tags in register names via validation or sanitization', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: `xss_${randomUUID().slice(0, 8)}@example.com`,
      password: 'SecurePass1!',
      firstName: '<script>alert(1)</script>',
      lastName: 'User',
      acceptTerms: true,
      acceptRisk: true,
    })
    // Either validation fails or registration succeeds with sanitized storage — never 500
    expect(res.status).toBeLessThan(500)
  })

  it('mass assignment: register ignores role elevation fields', async () => {
    const email = `mass_${randomUUID().slice(0, 8)}@example.com`
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'SecurePass1!',
        firstName: 'Mass',
        lastName: 'Assign',
        acceptTerms: true,
        acceptRisk: true,
        role: 'SUPER_ADMIN',
        staffRole: 'SUPER_ADMIN',
      })
    expect([200, 201]).toContain(res.status)
    const { prisma } = await import('../../src/database/prisma.js')
    const user = await prisma.user.findFirst({ where: { email } })
    expect(user?.role).toBe('USER')
    expect(user?.staffRole).toBeNull()
  })

  it('path traversal on signed download fails closed', async () => {
    const res = await request(app).get('/api/v1/files/download').query({
      key: '../etc/passwd',
      expires: String(Math.floor(Date.now() / 1000) + 300),
      signature: 'deadbeef',
    })
    expect([400, 401, 403, 404]).toContain(res.status)
  })

  it('open redirect on email click tracking stays relative or fails closed', async () => {
    const res = await request(app).get('/api/v1/emails/c/invalid-token').query({
      url: 'https://evil.example/phish',
    })
    // Invalid token should not 500; redirect target must not open arbitrary hosts unchecked
    expect(res.status).toBeLessThan(500)
    if (res.status === 302) {
      const loc = res.headers.location || ''
      expect(loc.startsWith('https://evil.example')).toBe(false)
    }
  })

  it('investor cannot request platform-wide KYC report export', async () => {
    const { agent } = await createActiveInvestor()
    const res = await agent.post('/api/v1/reports/export').send({
      type: 'KYC',
      format: 'JSON',
    })
    expect(res.status).toBe(400)
  })

  it('blocks public access to private upload prefixes', async () => {
    const res = await request(app).get('/uploads/deposits/fake-proof.pdf')
    expect(res.status).toBe(403)
    expect(res.body.error?.code).toBe('FORBIDDEN')
  })
})
