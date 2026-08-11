import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../app.js'
import { moneyString } from '../../utils/money.js'

const app = createApp()

describe('Admin deposit list visibility', () => {
  it('lists APPROVED deposits (including OxaPay gateway) under status=APPROVED', async () => {
    const email = `adm_dep_${randomUUID().slice(0, 8)}@example.com`
    const password = 'SecurePass1!'

    await request(app).post('/api/v1/auth/register').send({
      email,
      password,
      firstName: 'Admin',
      lastName: 'Deposits',
      acceptTerms: true,
      acceptRisk: true,
    })

    const { prisma } = await import('../../database/prisma.js')
    const user = await prisma.user.findFirstOrThrow({ where: { email } })
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        kycStatus: 'APPROVED',
        role: 'SUPER_ADMIN',
        staffRole: 'SUPER_ADMIN',
      },
    })

    for (const code of ['SYS:CLEARING', 'SYS:PAYOUT', 'SYS:FEES', 'SYS:SUSPENSE']) {
      await prisma.ledgerAccount.upsert({
        where: { code },
        create: { code, name: code, accountType: 'ASSET', isSystem: true },
        update: {},
      })
    }

    const { ledgerService } = await import('../finance/ledger.service.js')
    await ledgerService.ensureWalletsForUser(user.id)
    const wallet = await prisma.wallet.findFirstOrThrow({
      where: { userId: user.id, kind: 'INVESTMENT' },
    })

    const method = await prisma.paymentMethod.create({
      data: {
        name: `USDT TRC20 ${randomUUID().slice(0, 6)}`,
        type: 'USDT_TRC20',
        instructions: 'Admin list test',
        minAmount: moneyString(1),
        maxAmount: moneyString(250000),
        feePct: moneyString(0),
        isActive: true,
      },
    })

    const trackId = `track-admin-${randomUUID().slice(0, 8)}`
    const reference = `DEP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`
    const approved = await prisma.deposit.create({
      data: {
        reference,
        userId: user.id,
        walletId: wallet.id,
        paymentMethodId: method.id,
        amount: moneyString(1),
        fee: moneyString(0),
        currency: 'USD',
        status: 'APPROVED',
        creditedAmount: moneyString(1),
        userReference: trackId,
        reviewedAt: new Date(),
        lockDays: 10,
        fundsUnlockAt: new Date(Date.now() + 10 * 24 * 3600_000),
        submissionDetails: {
          gateway: 'oxapay',
          oxapayTrackId: trackId,
          oxapayOrderId: reference,
          oxapayConfirmedAt: new Date().toISOString(),
          oxapayVerificationResult: 'ok',
          expectedNetwork: 'TRC20',
          network: 'TRC20',
          coin: 'USDT',
        },
        idempotencyKey: `admin-list-${randomUUID()}`,
      },
    })

    const pending = await prisma.deposit.create({
      data: {
        reference: `DEP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
        userId: user.id,
        walletId: wallet.id,
        paymentMethodId: method.id,
        amount: moneyString(2),
        fee: moneyString(0),
        currency: 'USD',
        status: 'PENDING',
        idempotencyKey: `admin-list-pending-${randomUUID()}`,
      },
    })

    const agent = request.agent(app)
    const login = await agent.post('/api/v1/auth/login').send({ email, password })
    expect(login.status).toBe(200)

    const approvedList = await agent.get('/api/v1/admin/deposits?status=APPROVED&limit=50')
    expect(approvedList.status).toBe(200)
    const approvedIds = (approvedList.body.data.items as Array<{ id: string }>).map((d) => d.id)
    expect(approvedIds).toContain(approved.id)
    expect(approvedIds).not.toContain(pending.id)

    const row = (approvedList.body.data.items as Array<Record<string, unknown>>).find(
      (d) => d.id === approved.id,
    )
    expect(row?.status).toBe('APPROVED')
    expect(row?.gateway).toBe('oxapay')
    expect(row?.oxapayTrackId).toBe(trackId)
    expect(row?.reference).toBe(reference)

    const byTrack = await agent.get(
      `/api/v1/admin/deposits?status=APPROVED&q=${encodeURIComponent(trackId)}`,
    )
    expect(byTrack.status).toBe(200)
    expect((byTrack.body.data.items as Array<{ id: string }>).map((d) => d.id)).toContain(
      approved.id,
    )

    const pendingList = await agent.get('/api/v1/admin/deposits?status=PENDING&limit=50')
    expect(pendingList.status).toBe(200)
    const pendingIds = (pendingList.body.data.items as Array<{ id: string }>).map((d) => d.id)
    expect(pendingIds).toContain(pending.id)
    expect(pendingIds).not.toContain(approved.id)
  })
})
