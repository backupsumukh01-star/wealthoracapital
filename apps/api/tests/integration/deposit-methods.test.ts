import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../src/app.js'

const app = createApp()

async function registerActive(email: string, password = 'SecurePass1!') {
  await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    firstName: 'Pay',
    lastName: 'Methods',
    acceptTerms: true,
    acceptRisk: true,
  })
  const { prisma } = await import('../../src/database/prisma.js')
  const user = await prisma.user.findFirstOrThrow({ where: { email } })
  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      kycStatus: 'APPROVED',
    },
  })
  return user.id
}

async function loginAgent(email: string, password = 'SecurePass1!') {
  const agent = request.agent(app)
  const login = await agent.post('/api/v1/auth/login').send({ email, password })
  expect(login.status).toBe(200)
  const csrf = (login.body.data.csrfToken as string) || 'test'
  return { agent, csrf }
}

describe('deposit methods module', () => {
  it('creates UPI, bank, crypto multi-wallet, manual; investor sees only enabled wallets', async () => {
    const adminEmail = `pm_admin_${randomUUID().slice(0, 8)}@example.com`
    const invEmail = `pm_inv_${randomUUID().slice(0, 8)}@example.com`
    const adminId = await registerActive(adminEmail)
    await registerActive(invEmail)

    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.update({
      where: { id: adminId },
      data: { role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' },
    })

    const { agent, csrf } = await loginAgent(adminEmail)

    const upi = await agent
      .post('/api/v1/admin/payment-methods')
      .set('x-csrf-token', csrf)
      .send({
        name: 'Growzy UPI',
        type: 'UPI',
        instructions: 'Pay via UPI and upload screenshot.',
        minAmount: '100',
        maxAmount: '50000',
        processingTime: 'Instant',
        upi: {
          upiId: 'growzy@okaxis',
          accountHolderName: 'Growzy Capital',
        },
      })
    expect(upi.status).toBe(200)
    expect(upi.body.data.type).toBe('UPI')
    expect(upi.body.data.upi.upiId).toBe('growzy@okaxis')

    const bank = await agent
      .post('/api/v1/admin/payment-methods')
      .set('x-csrf-token', csrf)
      .send({
        name: 'HDFC Settlement',
        type: 'BANK_TRANSFER',
        instructions: 'NEFT/IMPS only.',
        minAmount: '500',
        maxAmount: '200000',
        bank: {
          accountHolderName: 'Growzy Capital Pvt Ltd',
          bankName: 'HDFC Bank',
          accountNumber: '50200012345678',
          ifscCode: 'HDFC0001234',
          branch: 'Mumbai',
          accountType: 'CURRENT',
        },
      })
    expect(bank.status).toBe(200)
    expect(bank.body.data.bank.ifscCode).toBe('HDFC0001234')

    const crypto = await agent
      .post('/api/v1/admin/payment-methods')
      .set('x-csrf-token', csrf)
      .send({
        name: 'USDT deposits',
        type: 'CRYPTO',
        instructions: 'Send only USDT. Wrong network funds are lost.',
        minAmount: '50',
        cryptoWallets: [
          {
            label: 'Wallet 1',
            coin: 'USDT',
            network: 'TRC20',
            address: 'TXaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1',
            isActive: true,
          },
          {
            label: 'Wallet 2',
            coin: 'USDT',
            network: 'ERC20',
            address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb2',
            isActive: true,
          },
          {
            label: 'Wallet 3 offline',
            coin: 'USDT',
            network: 'BEP20',
            address: '0xccccccccccccccccccccccccccccccccccccccc3',
            isActive: false,
          },
        ],
      })
    expect(crypto.status).toBe(200)
    expect(crypto.body.data.cryptoWallets).toHaveLength(3)

    const manual = await agent
      .post('/api/v1/admin/payment-methods')
      .set('x-csrf-token', csrf)
      .send({
        name: 'Manual wire',
        type: 'MANUAL',
        instructions: 'Contact ops for wire instructions.',
        minAmount: '1000',
        maxAmount: '1000000',
      })
    expect(manual.status).toBe(200)

    await agent
      .patch(`/api/v1/admin/payment-methods/${upi.body.data.id}`)
      .set('x-csrf-token', csrf)
      .send({ isActive: false })
      .expect(200)

    const { agent: inv } = await loginAgent(invEmail)
    const methods = await inv.get('/api/v1/deposits/methods')
    expect(methods.status).toBe(200)
    const ids = methods.body.data.map((m: { id: string }) => m.id)
    expect(ids).not.toContain(upi.body.data.id)
    expect(ids).toContain(bank.body.data.id)
    expect(ids).toContain(crypto.body.data.id)

    const cryptoPublic = methods.body.data.find((m: { id: string }) => m.id === crypto.body.data.id)
    expect(cryptoPublic.cryptoWallets).toHaveLength(2)

    const ordered = [manual.body.data.id, bank.body.data.id, crypto.body.data.id, upi.body.data.id]
    const reordered = await agent
      .post('/api/v1/admin/payment-methods/reorder')
      .set('x-csrf-token', csrf)
      .send({ orderedIds: ordered })
    expect(reordered.status).toBe(200)
    const byId = new Map(
      (reordered.body.data as Array<{ id: string; priority: number }>).map((m) => [m.id, m.priority]),
    )
    expect(byId.get(manual.body.data.id)!).toBeLessThan(byId.get(bank.body.data.id)!)
    expect(byId.get(bank.body.data.id)!).toBeLessThan(byId.get(crypto.body.data.id)!)
    expect(byId.get(crypto.body.data.id)!).toBeLessThan(byId.get(upi.body.data.id)!)

    await agent
      .delete(`/api/v1/admin/payment-methods/${manual.body.data.id}`)
      .set('x-csrf-token', csrf)
      .expect(200)
  })

  it('rejects crypto method without wallets', async () => {
    const email = `pm_bad_${randomUUID().slice(0, 8)}@example.com`
    const userId = await registerActive(email)
    const { prisma } = await import('../../src/database/prisma.js')
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'SUPER_ADMIN', staffRole: 'SUPER_ADMIN' },
    })
    const { agent, csrf } = await loginAgent(email)
    const res = await agent
      .post('/api/v1/admin/payment-methods')
      .set('x-csrf-token', csrf)
      .send({
        name: 'Broken crypto',
        type: 'CRYPTO',
        instructions: 'Missing wallets',
        cryptoWallets: [],
      })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
