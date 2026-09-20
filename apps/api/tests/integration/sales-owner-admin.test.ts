import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { prisma } from '../../src/database/prisma.js'
import { passwordService } from '../../src/services/password.service.js'

const app = createApp()

function uniqueEmail(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}@example.com`
}

function uniqueCode() {
  return `S${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

async function promoteAdmin(email: string, role: 'SUPER_ADMIN' | 'ADMIN' = 'SUPER_ADMIN') {
  await prisma.user.updateMany({
    where: { email },
    data: {
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      role,
      staffRole: role,
    },
  })
}

async function registerAndLogin(role: 'investor' | 'ADMIN' | 'SUPER_ADMIN' = 'investor') {
  const email = uniqueEmail(role === 'investor' ? 'inv' : 'adm')
  const password = 'SecurePass1!'
  const reg = await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    firstName: 'Owner',
    lastName: 'Admin',
    acceptTerms: true,
    acceptRisk: true,
  })
  expect([200, 201]).toContain(reg.status)
  if (role !== 'investor') {
    await promoteAdmin(email, role)
  } else {
    await prisma.user.updateMany({
      where: { email },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    })
  }
  const agent = request.agent(app)
  const login = await agent.post('/api/v1/auth/login').send({ email, password })
  expect(login.status).toBe(200)
  return { agent, email, password }
}

async function createSalesmanDirect() {
  const password = 'SecureSales1!'
  const salesman = await prisma.salesman.create({
    data: {
      email: uniqueEmail('sm'),
      passwordHash: await passwordService.hash(password),
      name: 'Direct Sales',
      code: uniqueCode(),
      status: 'ACTIVE',
    },
  })
  return { salesman, password }
}

async function unusedSalesmanCode(preferred = 'S1') {
  const [salesman, investor] = await Promise.all([
    prisma.salesman.findUnique({ where: { code: preferred }, select: { id: true } }),
    prisma.user.findFirst({ where: { referralCode: preferred, deletedAt: null }, select: { id: true } }),
  ])
  if (!salesman && !investor) return preferred
  return uniqueCode()
}

describe('Sales owner salesman administration', () => {
  it('admin can create a salesman, first-touch attribution locks, and password is one-time', async () => {
    const code = await unusedSalesmanCode('S1')
    const owner = await registerAndLogin('SUPER_ADMIN')
    const created = await owner.agent.post('/api/v1/sales/owner/salesmen').send({
      name: 'Sales One',
      email: uniqueEmail('s1'),
      code,
    })
    expect(created.status).toBe(201)
    expect(created.body.data.salesman.code).toBe(code)
    expect(created.body.data.salesman.status).toBe('ACTIVE')
    expect(created.body.data.salesman.referralLink).toMatch(
      new RegExp(`/register\\?ref=${code}$`),
    )
    expect(created.body.data.temporaryPassword).toMatch(/[A-Z]/)
    expect(created.body.data.temporaryPassword).toMatch(/[a-z]/)
    expect(created.body.data.temporaryPassword).toMatch(/[0-9]/)
    expect(created.body.data.temporaryPassword).toMatch(/[^A-Za-z0-9]/)
    expect(JSON.stringify(created.body)).not.toMatch(/passwordHash/)

    const list = await owner.agent.get('/api/v1/sales/owner/salesmen')
    expect(list.status).toBe(200)
    const row = list.body.data.salesmen.find((item: { code: string }) => item.code === code)
    expect(row).toBeTruthy()
    expect(row.temporaryPassword).toBeUndefined()
    expect(JSON.stringify(list.body)).not.toMatch(/passwordHash|temporaryPassword/)

    const password = created.body.data.temporaryPassword as string
    const salesAgent = request.agent(app)
    const login = await salesAgent.post('/api/v1/sales/auth/login').send({
      email: created.body.data.salesman.email,
      password,
    })
    expect(login.status).toBe(200)
    expect(login.body.data.salesman.code).toBe(code)

    const investorEmail = uniqueEmail('attr')
    const reg = await request(app).post('/api/v1/auth/register').send({
      email: investorEmail,
      password: 'SecurePass1!',
      firstName: 'Smit',
      lastName: 'Shah',
      referralCode: code,
      acceptTerms: true,
      acceptRisk: true,
    })
    expect([200, 201]).toContain(reg.status)
    const user = await prisma.user.findFirstOrThrow({ where: { email: investorEmail } })
    expect(user.referredById).toBeNull()
    expect('salesmanId' in user).toBe(false)
    const attribution = await prisma.salesAttribution.findUniqueOrThrow({ where: { userId: user.id } })
    expect(attribution.salesmanId).toBe(created.body.data.salesman.id)
    expect(attribution.source).toBe('SALESMAN_LINK')

    const other = await owner.agent.post('/api/v1/sales/owner/salesmen').send({
      name: 'Sales Two',
      email: uniqueEmail('s2'),
      code: uniqueCode(),
    })
    expect(other.status).toBe(201)
    await prisma.salesAttribution.create({
      data: {
        userId: user.id,
        salesmanId: other.body.data.salesman.id,
        source: 'SALESMAN_LINK',
      },
    }).catch(() => undefined)
    const locked = await prisma.salesAttribution.findUniqueOrThrow({ where: { userId: user.id } })
    expect(locked.salesmanId).toBe(created.body.data.salesman.id)
  })

  it('rejects investor and salesman owner mutations; owner can disable and reset password', async () => {
    const owner = await registerAndLogin('ADMIN')
    const created = await owner.agent.post('/api/v1/sales/owner/salesmen').send({
      name: 'Managed Sales',
      email: uniqueEmail('mgr'),
      code: uniqueCode(),
    })
    expect(created.status).toBe(201)
    const salesmanId = created.body.data.salesman.id as string
    const originalPassword = created.body.data.temporaryPassword as string

    const investor = await registerAndLogin('investor')
    const invCreate = await investor.agent.post('/api/v1/sales/owner/salesmen').send({
      name: 'Nope',
      email: uniqueEmail('nope'),
    })
    expect(invCreate.status).toBe(403)
    const invPatch = await investor.agent.patch(`/api/v1/sales/owner/salesmen/${salesmanId}`).send({
      name: 'Hacked',
    })
    expect(invPatch.status).toBe(403)

    const salesAgent = request.agent(app)
    const salesLogin = await salesAgent.post('/api/v1/sales/auth/login').send({
      email: created.body.data.salesman.email,
      password: originalPassword,
    })
    expect(salesLogin.status).toBe(200)
    const salesCreate = await salesAgent.post('/api/v1/sales/owner/salesmen').send({
      name: 'Nope',
      email: uniqueEmail('salesnope'),
    })
    expect(salesCreate.status).toBe(401)
    const salesPatch = await salesAgent.patch(`/api/v1/sales/owner/salesmen/${salesmanId}`).send({
      name: 'Hacked',
    })
    expect(salesPatch.status).toBe(401)

    const renamed = await owner.agent.patch(`/api/v1/sales/owner/salesmen/${salesmanId}`).send({
      name: 'Renamed Sales',
    })
    expect(renamed.status).toBe(200)
    expect(renamed.body.data.salesman.name).toBe('Renamed Sales')

    const reset = await owner.agent.post(`/api/v1/sales/owner/salesmen/${salesmanId}/password`).send()
    expect(reset.status).toBe(200)
    const nextPassword = reset.body.data.temporaryPassword as string
    expect(nextPassword).toBeTruthy()
    expect(nextPassword).not.toBe(originalPassword)

    const oldLogin = await request(app).post('/api/v1/sales/auth/login').send({
      email: created.body.data.salesman.email,
      password: originalPassword,
    })
    expect(oldLogin.status).toBe(401)
    const meAfterReset = await salesAgent.get('/api/v1/sales/me')
    expect(meAfterReset.status).toBe(401)

    const newLogin = await request.agent(app).post('/api/v1/sales/auth/login').send({
      email: created.body.data.salesman.email,
      password: nextPassword,
    })
    expect(newLogin.status).toBe(200)

    const disabled = await owner.agent.patch(`/api/v1/sales/owner/salesmen/${salesmanId}`).send({
      status: 'DISABLED',
    })
    expect(disabled.status).toBe(200)
    expect(disabled.body.data.salesman.status).toBe('DISABLED')
    const disabledLogin = await request(app).post('/api/v1/sales/auth/login').send({
      email: created.body.data.salesman.email,
      password: nextPassword,
    })
    expect([401, 403]).toContain(disabledLogin.status)

    const duplicate = await owner.agent.post('/api/v1/sales/owner/salesmen').send({
      name: 'Dup',
      email: created.body.data.salesman.email,
      code: uniqueCode(),
    })
    expect(duplicate.status).toBe(409)
  })

  it('does not create an investor User for a salesman', async () => {
    const owner = await registerAndLogin('SUPER_ADMIN')
    const email = uniqueEmail('nouser')
    const created = await owner.agent.post('/api/v1/sales/owner/salesmen').send({
      name: 'Portal Only',
      email,
      code: uniqueCode(),
    })
    expect(created.status).toBe(201)
    expect(await prisma.user.findFirst({ where: { email } })).toBeNull()
    const { salesman } = await createSalesmanDirect()
    expect(await prisma.user.findFirst({ where: { email: salesman.email } })).toBeNull()
  })

  it('owner can change salesman promo code; salesman/investor cannot; collision and session rules hold', async () => {
    const owner = await registerAndLogin('SUPER_ADMIN')
    const initialCode = uniqueCode()
    const created = await owner.agent.post('/api/v1/sales/owner/salesmen').send({
      name: 'Promo Sales',
      email: uniqueEmail('promo'),
      code: initialCode,
    })
    expect(created.status).toBe(201)
    const salesmanId = created.body.data.salesman.id as string
    const salesmanEmail = created.body.data.salesman.email as string
    const temporaryPassword = created.body.data.temporaryPassword as string

    const salesAgent = request.agent(app)
    const salesLogin = await salesAgent.post('/api/v1/sales/auth/login').send({
      email: salesmanEmail,
      password: temporaryPassword,
    })
    expect(salesLogin.status).toBe(200)
    expect(salesLogin.body.data.salesman.code).toBe(initialCode)

    // Attribute an investor under the original code (first-touch lock).
    const attributedEmail = uniqueEmail('locked')
    const attributedReg = await request(app).post('/api/v1/auth/register').send({
      email: attributedEmail,
      password: 'SecurePass1!',
      firstName: 'Lock',
      lastName: 'Cust',
      referralCode: initialCode,
      acceptTerms: true,
      acceptRisk: true,
    })
    expect([200, 201]).toContain(attributedReg.status)
    const attributedUser = await prisma.user.findFirstOrThrow({ where: { email: attributedEmail } })
    const lockedAttribution = await prisma.salesAttribution.findUniqueOrThrow({
      where: { userId: attributedUser.id },
    })
    expect(lockedAttribution.salesmanId).toBe(salesmanId)

    // Investor referral code that will intentionally collide after promo rename.
    const investorCode = `H${randomUUID().replace(/-/g, '').slice(0, 7).toUpperCase()}`
    await prisma.user.create({
      data: {
        email: uniqueEmail('codecollide'),
        passwordHash: 'x',
        firstName: 'Code',
        lastName: 'Holder',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        referralCode: investorCode,
      },
    })

    const other = await owner.agent.post('/api/v1/sales/owner/salesmen').send({
      name: 'Other Sales',
      email: uniqueEmail('other'),
      code: uniqueCode(),
    })
    expect(other.status).toBe(201)
    const otherCode = other.body.data.salesman.code as string

    // Reject invalid / empty / whitespace / duplicate salesman codes + mass assignment.
    const empty = await owner.agent.patch(`/api/v1/sales/owner/salesmen/${salesmanId}`).send({ code: '' })
    expect(empty.status).toBe(400)
    const whitespace = await owner.agent
      .patch(`/api/v1/sales/owner/salesmen/${salesmanId}`)
      .send({ code: '   ' })
    expect(whitespace.status).toBe(400)
    const invalid = await owner.agent
      .patch(`/api/v1/sales/owner/salesmen/${salesmanId}`)
      .send({ code: 'BAD-CODE!' })
    expect(invalid.status).toBe(400)
    const duplicate = await owner.agent
      .patch(`/api/v1/sales/owner/salesmen/${salesmanId}`)
      .send({ code: otherCode })
    expect(duplicate.status).toBe(409)
    const massAssign = await owner.agent.patch(`/api/v1/sales/owner/salesmen/${salesmanId}`).send({
      code: investorCode,
      role: 'SUPER_ADMIN',
      staffRole: 'SUPER_ADMIN',
      isOwner: true,
      passwordHash: 'hacked',
      status: 'DISABLED',
    })
    expect(massAssign.status).toBe(400)

    // Investor and salesman cannot change the promo code.
    const investor = await registerAndLogin('investor')
    const invPatch = await investor.agent
      .patch(`/api/v1/sales/owner/salesmen/${salesmanId}`)
      .send({ code: investorCode })
    expect(invPatch.status).toBe(403)
    const salesPatch = await salesAgent
      .patch(`/api/v1/sales/owner/salesmen/${salesmanId}`)
      .send({ code: investorCode })
    expect(salesPatch.status).toBe(401)

    // Owner changes code to collide with investor referral — ACTIVE salesman wins.
    const renamed = await owner.agent
      .patch(`/api/v1/sales/owner/salesmen/${salesmanId}`)
      .send({ code: investorCode.toLowerCase() })
    expect(renamed.status).toBe(200)
    expect(renamed.body.data.salesman.code).toBe(investorCode)
    expect(renamed.body.data.salesman.referralLink).toMatch(
      new RegExp(`/register\\?ref=${investorCode}$`),
    )
    expect(renamed.body.data.salesman.status).toBe('ACTIVE')

    // Existing attribution unchanged; session remains valid; me shows new code.
    const stillLocked = await prisma.salesAttribution.findUniqueOrThrow({
      where: { userId: attributedUser.id },
    })
    expect(stillLocked.salesmanId).toBe(salesmanId)
    const meAfter = await salesAgent.get('/api/v1/sales/me')
    expect(meAfter.status).toBe(200)
    expect(meAfter.body.data.salesman.code).toBe(investorCode)
    expect(meAfter.body.data.salesman.referralLink).toMatch(
      new RegExp(`/register\\?ref=${investorCode}$`),
    )
    expect(meAfter.body.data.salesman.id).toBe(salesmanId)

    const futureEmail = uniqueEmail('future')
    const futureReg = await request(app).post('/api/v1/auth/register').send({
      email: futureEmail,
      password: 'SecurePass1!',
      firstName: 'Future',
      lastName: 'Cust',
      referralCode: investorCode,
      acceptTerms: true,
      acceptRisk: true,
    })
    expect([200, 201]).toContain(futureReg.status)
    const futureUser = await prisma.user.findFirstOrThrow({ where: { email: futureEmail } })
    expect(futureUser.referredById).toBeNull()
    const futureAttr = await prisma.salesAttribution.findUniqueOrThrow({
      where: { userId: futureUser.id },
    })
    expect(futureAttr.salesmanId).toBe(salesmanId)

    // Disabled salesman does not capture new registrations; investor referral resumes.
    const disabled = await owner.agent
      .patch(`/api/v1/sales/owner/salesmen/${salesmanId}`)
      .send({ status: 'DISABLED' })
    expect(disabled.status).toBe(200)
    const resumeEmail = uniqueEmail('resume')
    const resumeReg = await request(app).post('/api/v1/auth/register').send({
      email: resumeEmail,
      password: 'SecurePass1!',
      firstName: 'Resume',
      lastName: 'Investor',
      referralCode: investorCode,
      acceptTerms: true,
      acceptRisk: true,
    })
    expect([200, 201]).toContain(resumeReg.status)
    const resumeUser = await prisma.user.findFirstOrThrow({ where: { email: resumeEmail } })
    const codeOwner = await prisma.user.findFirstOrThrow({ where: { referralCode: investorCode } })
    expect(resumeUser.referredById).toBe(codeOwner.id)
    expect(await prisma.salesAttribution.findUnique({ where: { userId: resumeUser.id } })).toBeNull()
  })
})
