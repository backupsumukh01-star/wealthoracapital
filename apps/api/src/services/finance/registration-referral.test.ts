import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'

import { createApp } from '../../app.js'
import { prisma } from '../../database/prisma.js'
import { moneyString } from '../../utils/money.js'
import { ledgerService } from '../finance/ledger.service.js'
import { referralService } from '../finance/referral.service.js'

const app = createApp()

async function createReferrer() {
  const email = `ref_r_${randomUUID().slice(0, 8)}@example.com`
  const code = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
  return prisma.user.create({
    data: {
      email,
      passwordHash: 'x',
      firstName: 'Refer',
      lastName: 'Rer',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      kycStatus: 'APPROVED',
      referralCode: code,
    },
  })
}

describe('Phase 3C registration referral + eligibility', () => {
  beforeAll(async () => {
    const settings = await prisma.platformSetting.findFirst()
    if (settings) {
      await prisma.platformSetting.update({
        where: { id: settings.id },
        data: { referralEnabled: false },
      })
    }
  })

  afterAll(async () => {
    const settings = await prisma.platformSetting.findFirst()
    if (settings) {
      await prisma.platformSetting.update({
        where: { id: settings.id },
        data: { referralEnabled: false },
      })
    }
  })

  it('1. registration without referral code', async () => {
    const email = `noref_${randomUUID().slice(0, 8)}@example.com`
    const res = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'SecurePass1!',
      firstName: 'No',
      lastName: 'Ref',
      acceptTerms: true,
      acceptRisk: true,
    })
    expect([200, 201]).toContain(res.status)
    const user = await prisma.user.findFirstOrThrow({ where: { email } })
    expect(user.referredById).toBeNull()
    expect(user.referralCode).toBeTruthy()
  })

  it('2+6. registration with valid referral code stores relationship', async () => {
    const referrer = await createReferrer()
    const email = `withref_${randomUUID().slice(0, 8)}@example.com`
    const res = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'SecurePass1!',
      firstName: 'With',
      lastName: 'Ref',
      referralCode: referrer.referralCode!.toLowerCase(),
      acceptTerms: true,
      acceptRisk: true,
    })
    expect([200, 201]).toContain(res.status)
    const user = await prisma.user.findFirstOrThrow({ where: { email } })
    expect(user.referredById).toBe(referrer.id)
  })

  it('3. invalid referral code is rejected', async () => {
    const email = `badref_${randomUUID().slice(0, 8)}@example.com`
    const res = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'SecurePass1!',
      firstName: 'Bad',
      lastName: 'Ref',
      referralCode: 'NOTEXIST1',
      acceptTerms: true,
      acceptRisk: true,
    })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(String(res.body.error?.message ?? '')).toMatch(/invalid referral code/i)
    expect(await prisma.user.findFirst({ where: { email } })).toBeNull()
  })

  it('7+8. registration does not create rewards or wallet credits', async () => {
    const referrer = await createReferrer()
    await ledgerService.ensureWalletsForUser(referrer.id)
    const before = await prisma.wallet.findFirstOrThrow({
      where: { userId: referrer.id, kind: 'REFERRAL' },
    })
    const email = `norwd_${randomUUID().slice(0, 8)}@example.com`
    const res = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'SecurePass1!',
      firstName: 'No',
      lastName: 'Reward',
      referralCode: referrer.referralCode!,
      acceptTerms: true,
      acceptRisk: true,
    })
    expect([200, 201]).toContain(res.status)
    const referee = await prisma.user.findFirstOrThrow({ where: { email } })
    expect(
      await prisma.referralReward.count({
        where: { OR: [{ referrerId: referrer.id }, { refereeId: referee.id }] },
      }),
    ).toBe(0)
    const after = await prisma.wallet.findFirstOrThrow({
      where: { userId: referrer.id, kind: 'REFERRAL' },
    })
    expect(moneyString(after.availableBalance)).toBe(moneyString(before.availableBalance))
    expect(moneyString(after.balance)).toBe(moneyString(before.balance))
  })

  it('9. existing registration still works (empty referralCode)', async () => {
    const email = `emptyref_${randomUUID().slice(0, 8)}@example.com`
    const res = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'SecurePass1!',
      firstName: 'Empty',
      lastName: 'Ref',
      referralCode: '   ',
      acceptTerms: true,
      acceptRisk: true,
    })
    expect([200, 201]).toContain(res.status)
    const user = await prisma.user.findFirstOrThrow({ where: { email } })
    expect(user.referredById).toBeNull()
  })

  it('11. referral feature remains disabled', async () => {
    const settings = await prisma.platformSetting.findFirstOrThrow()
    expect(settings.referralEnabled).toBe(false)
  })

  it('12–15. eligibility requires APPROVED deposit only', async () => {
    const user = await prisma.user.create({
      data: {
        email: `elig_${randomUUID().slice(0, 8)}@example.com`,
        passwordHash: 'x',
        firstName: 'Elig',
        lastName: 'User',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        kycStatus: 'APPROVED',
        referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
      },
    })
    await ledgerService.ensureWalletsForUser(user.id)
    const wallet = await prisma.wallet.findFirstOrThrow({
      where: { userId: user.id, kind: 'INVESTMENT' },
    })
    const method =
      (await prisma.paymentMethod.findFirst({ where: { isActive: true, deletedAt: null } })) ??
      (await prisma.paymentMethod.create({
        data: {
          name: `Elig ${randomUUID().slice(0, 4)}`,
          type: 'BANK_TRANSFER',
          instructions: 't',
          minAmount: moneyString(1),
          feePct: moneyString(0),
          isActive: true,
        },
      }))

    let summary = await referralService.summary(user.id)
    expect(summary.referralEligible).toBe(false)
    expect(summary.referralCode).toBeNull()
    expect(summary.referralLink).toBeNull()
    expect(summary.referralEnabled).toBe(false)

    await prisma.deposit.create({
      data: {
        reference: `DEP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
        userId: user.id,
        walletId: wallet.id,
        paymentMethodId: method.id,
        amount: moneyString(10),
        fee: moneyString(0),
        status: 'PENDING',
        idempotencyKey: `elig-pending-${randomUUID()}`,
      },
    })
    summary = await referralService.summary(user.id)
    expect(summary.referralEligible).toBe(false)
    expect(summary.referralLink).toBeNull()

    await prisma.deposit.create({
      data: {
        reference: `DEP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
        userId: user.id,
        walletId: wallet.id,
        paymentMethodId: method.id,
        amount: moneyString(10),
        fee: moneyString(0),
        status: 'UNDER_REVIEW',
        idempotencyKey: `elig-review-${randomUUID()}`,
      },
    })
    summary = await referralService.summary(user.id)
    expect(summary.referralEligible).toBe(false)
    expect(summary.referralCode).toBeNull()

    await prisma.deposit.create({
      data: {
        reference: `DEP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
        userId: user.id,
        walletId: wallet.id,
        paymentMethodId: method.id,
        amount: moneyString(10),
        creditedAmount: moneyString(10),
        fee: moneyString(0),
        status: 'APPROVED',
        reviewedAt: new Date(),
        idempotencyKey: `elig-approved-${randomUUID()}`,
      },
    })
    summary = await referralService.summary(user.id)
    expect(summary.referralEligible).toBe(true)
    expect(summary.referralCode).toBe(user.referralCode)
    expect(summary.referralLink).toContain(`/register?ref=${encodeURIComponent(user.referralCode!)}`)
    expect(summary.referralLink).not.toContain(user.id)
  })
})
