import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'

const app = createApp()

function uniqueEmail() {
  return `qa_${randomUUID().slice(0, 8)}@example.com`
}

describe('Auth flows', () => {
  it('rejects weak passwords on register', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: uniqueEmail(),
      password: 'weak',
      firstName: 'Qa',
      lastName: 'User',
    })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('register → login → me → logout', async () => {
    const email = uniqueEmail()
    const password = 'SecurePass1!'

    const reg = await request(app).post('/api/v1/auth/register').send({
      email,
      password,
      firstName: 'Qa',
      lastName: 'Investor',
      acceptTerms: true,
      acceptRisk: true,
    })
    expect([200, 201]).toContain(reg.status)
    expect(reg.body.success).toBe(true)
    expect(reg.body.data.userId).toBeTruthy()

    // Activate for login if pending verification blocks login — force via prisma when needed
    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.updateMany({
      where: { email },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    })

    const agent = request.agent(app)
    const login = await agent.post('/api/v1/auth/login').send({ email, password })
    expect(login.status).toBe(200)
    expect(login.body.data.user.email.toLowerCase()).toBe(email.toLowerCase())
    expect(login.headers['set-cookie']?.join(';') || '').toMatch(/mfx_at/)

    const me = await agent.get('/api/v1/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.data.user.id).toBeTruthy()

    const logout = await agent.post('/api/v1/auth/logout')
    expect(logout.status).toBe(200)

    const meAfter = await agent.get('/api/v1/auth/me')
    expect(meAfter.status).toBe(401)
  })

  it('login fails with wrong password', async () => {
    const email = uniqueEmail()
    const password = 'SecurePass1!'
    await request(app).post('/api/v1/auth/register').send({
      email,
      password,
      firstName: 'Qa',
      lastName: 'User',
      acceptTerms: true,
      acceptRisk: true,
    })
    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.updateMany({
      where: { email },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    })

    const res = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'WrongPass1!',
    })
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('protected routes reject missing auth cookie', async () => {
    const res = await request(app).get('/api/v1/wallet')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toMatch(/UNAUTHENTICATED|TOKEN/)
  })

  it('refresh without cookie fails', async () => {
    const res = await request(app).post('/api/v1/auth/refresh')
    expect([401, 400]).toContain(res.status)
  })
})
