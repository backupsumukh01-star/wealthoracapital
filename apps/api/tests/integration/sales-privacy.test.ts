import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'
import { prisma } from '../../src/database/prisma.js'
import { collectBlockedSalesCustomerKeys } from '../../src/services/sales-privacy.js'
import { passwordService } from '../../src/services/password.service.js'

const app = createApp()

function uniqueEmail(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}@example.com`
}

function uniqueCode() {
  return `S${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

async function createSalesman() {
  const password = 'SecureSales1!'
  const salesman = await prisma.salesman.create({
    data: {
      email: uniqueEmail('priv'),
      passwordHash: await passwordService.hash(password),
      name: 'Privacy Sales',
      code: uniqueCode(),
      status: 'ACTIVE',
    },
  })
  return { salesman, password }
}

async function loginSales(email: string, password: string) {
  const agent = request.agent(app)
  const login = await agent.post('/api/v1/sales/auth/login').send({ email, password })
  expect(login.status).toBe(200)
  return agent
}

async function createInvestor(opts?: { firstName?: string; lastName?: string; referredById?: string }) {
  return prisma.user.create({
    data: {
      email: uniqueEmail('cust'),
      passwordHash: await passwordService.hash('SecurePass1!'),
      firstName: opts?.firstName ?? 'Harsh',
      lastName: opts?.lastName ?? 'Patel',
      phone: `+91${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      kycStatus: 'NOT_STARTED',
      referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
      ...(opts?.referredById ? { referredById: opts.referredById } : {}),
    },
  })
}

describe('Sales customer privacy and read-only APIs', () => {
  it('omits customer email/phone/KYC from salesman network payloads', async () => {
    const a = await createSalesman()
    const customer = await createInvestor()
    const downline = await createInvestor({
      firstName: 'Riya',
      lastName: 'Shah',
      referredById: customer.id,
    })
    await prisma.salesAttribution.create({
      data: { userId: customer.id, salesmanId: a.salesman.id, source: 'SALESMAN_LINK' },
    })

    const agent = await loginSales(a.salesman.email, a.password)
    const network = await agent.get('/api/v1/sales/me/network')
    expect(network.status).toBe(200)
    const members = network.body.data.members as Array<{
      userId: string
      username: string
      name: string
      currentBalance: string
      directReferralCount: number
      networkMemberCount: number
    }>
    expect(members).toHaveLength(2)
    const root = members.find((row) => row.userId === customer.id)
    expect(root?.name).toBe('Harsh Patel')
    expect(root?.username).toBe(customer.email.split('@')[0])
    expect(root?.directReferralCount).toBe(1)
    expect(root?.networkMemberCount).toBe(1)
    expect(root?.currentBalance).toBeTruthy()
    expect(collectBlockedSalesCustomerKeys(network.body.data.members)).toEqual([])
    expect(JSON.stringify(network.body.data.members)).not.toMatch(/@/)
    expect(JSON.stringify(network.body.data.members)).not.toContain(customer.email)
    expect(JSON.stringify(network.body.data.members)).not.toContain(customer.phone)

    const detail = await agent.get(`/api/v1/sales/me/network/members/${customer.id}`)
    expect(detail.status).toBe(200)
    expect(detail.body.data.member.userId).toBe(customer.id)
    expect(detail.body.data.member.username).toBe(root?.username)
    expect(Array.isArray(detail.body.data.depositHistory)).toBe(true)
    expect(Array.isArray(detail.body.data.withdrawalHistory)).toBe(true)
    expect(collectBlockedSalesCustomerKeys(detail.body.data)).toEqual([])
    expect(JSON.stringify(detail.body.data)).not.toContain(customer.email)
    expect(JSON.stringify(detail.body.data)).not.toContain(downline.email)
  })

  it('rejects IDOR on customer detail and all salesman mutations', async () => {
    const a = await createSalesman()
    const b = await createSalesman()
    const customer = await createInvestor()
    await prisma.salesAttribution.create({
      data: { userId: customer.id, salesmanId: a.salesman.id, source: 'SALESMAN_LINK' },
    })

    const agentB = await loginSales(b.salesman.email, b.password)
    const sneak = await agentB.get(`/api/v1/sales/me/network/members/${customer.id}`)
    expect(sneak.status).toBe(404)

    const agentA = await loginSales(a.salesman.email, a.password)
    const patch = await agentA.patch(`/api/v1/sales/me/network/members/${customer.id}`).send({
      email: 'stolen@example.com',
    })
    expect(patch.status).toBe(405)
    const del = await agentA.delete(`/api/v1/sales/me`)
    expect(del.status).toBe(405)
    const post = await agentA.post('/api/v1/sales/me/network').send({})
    expect(post.status).toBe(405)
    const put = await agentA.put('/api/v1/sales/me').send({})
    expect(put.status).toBe(405)
    const head = await agentA.head('/api/v1/sales/me')
    expect(head.status).toBe(200)
    const options = await agentA.options('/api/v1/sales/me/network')
    expect([200, 204]).toContain(options.status)
  })
})
