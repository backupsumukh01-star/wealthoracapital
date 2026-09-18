import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { SALES_COOKIE_NAMES } from '../../src/config/sales-cookies.js'
import { COOKIE_NAMES } from '../../src/config/cookies.js'
import { passwordService } from '../../src/services/password.service.js'
import { salesTokenService } from '../../src/services/sales-token.service.js'
import { tokenService } from '../../src/services/token.service.js'

const app = createApp()

function uniqueEmail(prefix = 'sales') {
  return `${prefix}_${randomUUID().slice(0, 8)}@example.com`
}

function uniqueCode() {
  return `S${randomUUID().replace(/-/g, '').slice(0, 15)}`
}

function cookieLines(res: { headers: Record<string, unknown> }): string[] {
  const raw = res.headers['set-cookie']
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') return [raw]
  return []
}

function cookieHeader(res: { headers: Record<string, unknown> }): string {
  return cookieLines(res).join('\n')
}

function cookieValue(res: { headers: Record<string, unknown> }, name: string): string | undefined {
  const prefix = `${name}=`
  for (const line of cookieLines(res)) {
    if (line.startsWith(prefix) || line.toLowerCase().startsWith(prefix.toLowerCase())) {
      return decodeURIComponent(line.slice(prefix.length).split(';')[0] ?? '')
    }
  }
  return undefined
}

async function createSalesman(input?: { status?: 'ACTIVE' | 'DISABLED'; password?: string }) {
  const { prisma } = await import('../../src/database/prisma.js')
  const password = input?.password ?? 'SecureSales1!'
  const salesman = await prisma.salesman.create({
    data: {
      email: uniqueEmail(),
      passwordHash: await passwordService.hash(password),
      name: 'Test Salesman',
      code: uniqueCode(),
      status: input?.status ?? 'ACTIVE',
    },
  })
  return { salesman, password }
}

async function registerInvestor() {
  const email = uniqueEmail('inv')
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
  const { prisma } = await import('../../src/database/prisma.js')
  await prisma.user.updateMany({
    where: { email },
    data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
  })
  return { email, password }
}

describe('Salesman authentication isolation', () => {
  it('valid salesman login succeeds and sets only sales cookies', async () => {
    const { salesman, password } = await createSalesman()
    const { prisma } = await import('../../src/database/prisma.js')
    const sessionsBefore = await prisma.session.count()

    const res = await request(app).post('/api/v1/sales/auth/login').send({
      email: salesman.email,
      password,
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.salesman).toMatchObject({
      id: salesman.id,
      name: salesman.name,
      email: salesman.email.toLowerCase(),
      code: salesman.code,
      status: 'ACTIVE',
    })
    expect(res.body.data.salesman.passwordHash).toBeUndefined()
    expect(res.body.data.tokens).toBeUndefined()

    const header = cookieHeader(res)
    expect(header).toMatch(new RegExp(`${SALES_COOKIE_NAMES.accessToken}=`))
    expect(header).toMatch(new RegExp(`${SALES_COOKIE_NAMES.refreshToken}=`))
    expect(header).not.toMatch(/mfx_at=/)
    expect(header).not.toMatch(/mfx_rt=/)

    const sessionsAfter = await prisma.session.count()
    expect(sessionsAfter).toBe(sessionsBefore)

    const salesSessions = await prisma.salesmanSession.findMany({
      where: { salesmanId: salesman.id },
    })
    expect(salesSessions).toHaveLength(1)
    expect(salesSessions[0]!.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/)
    expect(salesSessions[0]!.revokedAt).toBeNull()
    expect(salesSessions[0]!.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('wrong password returns 401', async () => {
    const { salesman } = await createSalesman()
    const res = await request(app).post('/api/v1/sales/auth/login').send({
      email: salesman.email,
      password: 'WrongPass1!',
    })
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('unknown email returns 401', async () => {
    const res = await request(app).post('/api/v1/sales/auth/login').send({
      email: uniqueEmail('missing'),
      password: 'SecureSales1!',
    })
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('DISABLED salesman login returns 403 ACCOUNT_SUSPENDED', async () => {
    const { salesman, password } = await createSalesman({ status: 'DISABLED' })
    const res = await request(app).post('/api/v1/sales/auth/login').send({
      email: salesman.email,
      password,
    })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED')
  })

  it('GET /sales/me succeeds with a valid sales session', async () => {
    const { salesman, password } = await createSalesman()
    const agent = request.agent(app)
    const login = await agent.post('/api/v1/sales/auth/login').send({
      email: salesman.email,
      password,
    })
    expect(login.status).toBe(200)

    const me = await agent.get('/api/v1/sales/me')
    expect(me.status).toBe(200)
    expect(me.body.data.salesman.id).toBe(salesman.id)
    expect(me.body.data.salesman.email.toLowerCase()).toBe(salesman.email.toLowerCase())
    expect(me.body.data.salesman.code).toBe(salesman.code)
    expect(me.body.data.salesman.status).toBe('ACTIVE')
    expect(me.body.data.salesman.passwordHash).toBeUndefined()
  })

  it('GET /sales/me without a sales cookie returns 401', async () => {
    const res = await request(app).get('/api/v1/sales/me')
    expect(res.status).toBe(401)
  })

  it('tampered sales JWT returns 401', async () => {
    const { salesman, password } = await createSalesman()
    const login = await request(app).post('/api/v1/sales/auth/login').send({
      email: salesman.email,
      password,
    })
    const token = cookieValue(login, SALES_COOKIE_NAMES.accessToken)
    expect(token).toBeTruthy()
    const tampered = `${token!.slice(0, -4)}xxxx`

    const res = await request(app)
      .get('/api/v1/sales/me')
      .set('Cookie', `${SALES_COOKIE_NAMES.accessToken}=${tampered}`)
    expect(res.status).toBe(401)
  })

  it('expired sales JWT returns 401', async () => {
    const { salesman, password } = await createSalesman()
    const login = await request(app).post('/api/v1/sales/auth/login').send({
      email: salesman.email,
      password,
    })
    expect(login.status).toBe(200)
    const { prisma } = await import('../../src/database/prisma.js')
    const session = await prisma.salesmanSession.findFirstOrThrow({
      where: { salesmanId: salesman.id, revokedAt: null },
    })
    const expired = salesTokenService.signAccessToken({
      salesmanId: salesman.id,
      sessionId: session.id,
      expiresIn: '1ms',
    })
    await new Promise((resolve) => setTimeout(resolve, 20))

    const res = await request(app)
      .get('/api/v1/sales/me')
      .set('Cookie', `${SALES_COOKIE_NAMES.accessToken}=${expired}`)
    expect(res.status).toBe(401)
  })

  it('investor mfx_at cannot authenticate as Salesman', async () => {
    const { email, password } = await registerInvestor()
    const login = await request(app).post('/api/v1/auth/login').send({ email, password })
    expect(login.status).toBe(200)
    const investorAt = cookieValue(login, COOKIE_NAMES.accessToken)
    expect(investorAt).toBeTruthy()

    const asSalesCookie = await request(app)
      .get('/api/v1/sales/me')
      .set('Cookie', `${SALES_COOKIE_NAMES.accessToken}=${investorAt}`)
    expect(asSalesCookie.status).toBe(401)

    const withInvestorCookies = await request(app)
      .get('/api/v1/sales/me')
      .set('Cookie', cookieLines(login).join('; '))
    expect(withInvestorCookies.status).toBe(401)
  })

  it('sales JWT cannot authenticate through investor authenticate middleware', async () => {
    const { salesman, password } = await createSalesman()
    const login = await request(app).post('/api/v1/sales/auth/login').send({
      email: salesman.email,
      password,
    })
    const salesAt = cookieValue(login, SALES_COOKIE_NAMES.accessToken)
    expect(salesAt).toBeTruthy()

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', `${COOKIE_NAMES.accessToken}=${salesAt}`)
    expect(res.status).toBe(401)
  })

  it('sales JWT cannot access admin endpoints', async () => {
    const { salesman, password } = await createSalesman()
    const agent = request.agent(app)
    await agent.post('/api/v1/sales/auth/login').send({
      email: salesman.email,
      password,
    })
    const res = await agent.get('/api/v1/admin/dashboard')
    expect(res.status).toBe(401)
  })

  it('sales JWT cannot access investor deposits', async () => {
    const { salesman, password } = await createSalesman()
    const agent = request.agent(app)
    await agent.post('/api/v1/sales/auth/login').send({
      email: salesman.email,
      password,
    })
    const res = await agent.get('/api/v1/deposits/methods')
    expect(res.status).toBe(401)
  })

  it('sales JWT cannot access investor withdrawals', async () => {
    const { salesman, password } = await createSalesman()
    const agent = request.agent(app)
    await agent.post('/api/v1/sales/auth/login').send({
      email: salesman.email,
      password,
    })
    const res = await agent.get('/api/v1/withdrawals/limits')
    expect(res.status).toBe(401)
  })

  it('sales JWT cannot access wallet', async () => {
    const { salesman, password } = await createSalesman()
    const agent = request.agent(app)
    await agent.post('/api/v1/sales/auth/login').send({
      email: salesman.email,
      password,
    })
    const res = await agent.get('/api/v1/wallet')
    expect(res.status).toBe(401)
  })

  it("salesman A cannot use salesman B's session", async () => {
    const a = await createSalesman()
    const b = await createSalesman()
    const loginA = await request(app).post('/api/v1/sales/auth/login').send({
      email: a.salesman.email,
      password: a.password,
    })
    const loginB = await request(app).post('/api/v1/sales/auth/login').send({
      email: b.salesman.email,
      password: b.password,
    })
    expect(loginA.status).toBe(200)
    expect(loginB.status).toBe(200)

    const { prisma } = await import('../../src/database/prisma.js')
    const sessionB = await prisma.salesmanSession.findFirstOrThrow({
      where: { salesmanId: b.salesman.id, revokedAt: null },
    })
    const forged = salesTokenService.signAccessToken({
      salesmanId: a.salesman.id,
      sessionId: sessionB.id,
    })
    const forgedRes = await request(app)
      .get('/api/v1/sales/me')
      .set('Cookie', `${SALES_COOKIE_NAMES.accessToken}=${forged}`)
    expect(forgedRes.status).toBe(401)

    const agentA = request.agent(app)
    await agentA.post('/api/v1/sales/auth/login').send({
      email: a.salesman.email,
      password: a.password,
    })
    const meA = await agentA.get('/api/v1/sales/me')
    expect(meA.status).toBe(200)
    expect(meA.body.data.salesman.id).toBe(a.salesman.id)
    expect(meA.body.data.salesman.id).not.toBe(b.salesman.id)
  })

  it('logout revokes the current salesman session and clears sales cookies', async () => {
    const { salesman, password } = await createSalesman()
    const agent = request.agent(app)
    const login = await agent.post('/api/v1/sales/auth/login').send({
      email: salesman.email,
      password,
    })
    expect(login.status).toBe(200)

    const { prisma } = await import('../../src/database/prisma.js')
    const session = await prisma.salesmanSession.findFirstOrThrow({
      where: { salesmanId: salesman.id, revokedAt: null },
    })

    const logout = await agent.post('/api/v1/sales/auth/logout')
    expect(logout.status).toBe(200)
    const header = cookieHeader(logout)
    expect(header).toMatch(new RegExp(`${SALES_COOKIE_NAMES.accessToken}=`))
    expect(header).toMatch(new RegExp(`${SALES_COOKIE_NAMES.refreshToken}=`))
    expect(header).not.toMatch(/mfx_at=/)
    expect(header).not.toMatch(/mfx_rt=/)

    const revoked = await prisma.salesmanSession.findUniqueOrThrow({ where: { id: session.id } })
    expect(revoked.revokedAt).toBeTruthy()

    const me = await agent.get('/api/v1/sales/me')
    expect(me.status).toBe(401)
  })

  it('reusing a revoked refresh session fails', async () => {
    const { salesman, password } = await createSalesman()
    const login = await request(app).post('/api/v1/sales/auth/login').send({
      email: salesman.email,
      password,
    })
    expect(login.status).toBe(200)
    const refreshToken = cookieValue(login, SALES_COOKIE_NAMES.refreshToken)
    const accessToken = cookieValue(login, SALES_COOKIE_NAMES.accessToken)
    expect(refreshToken).toBeTruthy()
    expect(accessToken).toBeTruthy()

    const logout = await request(app)
      .post('/api/v1/sales/auth/logout')
      .set('Cookie', `${SALES_COOKIE_NAMES.accessToken}=${accessToken}`)
    expect(logout.status).toBe(200)

    const reuse = await request(app)
      .post('/api/v1/sales/auth/refresh')
      .set('Cookie', `${SALES_COOKIE_NAMES.refreshToken}=${refreshToken}`)
    expect(reuse.status).toBe(401)
  })

  it('does not verify sales tokens with the investor JWT secret', () => {
    const token = salesTokenService.signAccessToken({
      salesmanId: randomUUID(),
      sessionId: randomUUID(),
    })
    expect(() => tokenService.verifyAccessToken(token)).toThrow()
  })
})
