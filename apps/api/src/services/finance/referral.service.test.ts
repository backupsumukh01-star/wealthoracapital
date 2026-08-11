import { randomUUID } from 'node:crypto'

import { describe, expect, it, beforeAll, afterAll } from 'vitest'

import { prisma } from '../../database/prisma.js'
import { d, moneyString } from '../../utils/money.js'
import { ledgerService } from './ledger.service.js'
import { mapWalletAggregate } from './finance.mappers.js'
import { referralService } from './referral.service.js'
import { depositService } from './deposit.service.js'

async function ensureSystemAccounts() {
  for (const code of ['SYS:CLEARING', 'SYS:PAYOUT', 'SYS:FEES', 'SYS:SUSPENSE']) {
    await prisma.ledgerAccount.upsert({
      where: { code },
      create: { code, name: code, accountType: 'ASSET', isSystem: true },
      update: {},
    })
  }
}

async function enableReferrals(percent = '5', unlockDays = 30) {
  const settings = await prisma.platformSetting.findFirst()
  if (settings) {
    return prisma.platformSetting.update({
      where: { id: settings.id },
      data: {
        referralEnabled: true,
        referralPercent: percent,
        referralUnlockDays: unlockDays,
      },
    })
  }
  return prisma.platformSetting.create({
    data: {
      referralEnabled: true,
      referralPercent: percent,
      referralUnlockDays: unlockDays,
      networks: [],
      coins: [],
    },
  })
}

async function createUser(opts?: {
  referredById?: string
  emailPrefix?: string
}) {
  const email = `${opts?.emailPrefix ?? 'ref'}_${randomUUID().slice(0, 8)}@example.com`
  return prisma.user.create({
    data: {
      email,
      passwordHash: 'x',
      firstName: 'Ref',
      lastName: 'User',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      kycStatus: 'APPROVED',
      referralCode: randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(),
      ...(opts?.referredById ? { referredById: opts.referredById } : {}),
    },
  })
}

async function createApprovedDepositShell(userId: string, amount: string) {
  await ledgerService.ensureWalletsForUser(userId)
  const wallet = await prisma.wallet.findFirstOrThrow({
    where: { userId, kind: 'INVESTMENT' },
  })
  const method =
    (await prisma.paymentMethod.findFirst({ where: { isActive: true, deletedAt: null } })) ??
    (await prisma.paymentMethod.create({
      data: {
        name: `Ref Method ${randomUUID().slice(0, 6)}`,
        type: 'BANK_TRANSFER',
        instructions: 'test',
        minAmount: moneyString(1),
        maxAmount: moneyString(1_000_000),
        feePct: moneyString(0),
        isActive: true,
      },
    }))

  return prisma.deposit.create({
    data: {
      reference: `DEP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
      userId,
      walletId: wallet.id,
      paymentMethodId: method.id,
      amount: moneyString(amount),
      fee: moneyString(0),
      creditedAmount: moneyString(amount),
      status: 'APPROVED',
      reviewedAt: new Date(),
      idempotencyKey: `ref-dep-${randomUUID()}`,
    },
  })
}

describe('Referral financial engine', () => {
  beforeAll(async () => {
    await ensureSystemAccounts()
    await enableReferrals('5', 30)
  })

  afterAll(async () => {
    const settings = await prisma.platformSetting.findFirst()
    if (settings) {
      await prisma.platformSetting.update({
        where: { id: settings.id },
        data: { referralEnabled: false, referralPercent: '5', referralUnlockDays: 30 },
      })
    }
  })

  it('1. no referredById → no reward', async () => {
    const user = await createUser({ emailPrefix: 'noref' })
    const deposit = await createApprovedDepositShell(user.id, '100')
    const reward = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, deposit),
    )
    expect(reward).toBeNull()
    expect(await prisma.referralReward.count({ where: { sourceDepositId: deposit.id } })).toBe(0)
  })

  it('2. invalid referrer → no reward', async () => {
    const referrer = await createUser({ emailPrefix: 'deleted' })
    const user = await createUser({ emailPrefix: 'badref', referredById: referrer.id })
    await prisma.user.update({
      where: { id: referrer.id },
      data: { deletedAt: new Date() },
    })
    const deposit = await createApprovedDepositShell(user.id, '100')
    const reward = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, deposit),
    )
    expect(reward).toBeNull()
  })

  it('3. self-referral → no reward', async () => {
    const user = await createUser({ emailPrefix: 'self' })
    await prisma.user.update({ where: { id: user.id }, data: { referredById: user.id } })
    const deposit = await createApprovedDepositShell(user.id, '100')
    const reward = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, deposit),
    )
    expect(reward).toBeNull()
  })

  it('4. referral disabled → no reward', async () => {
    const settings = await prisma.platformSetting.findFirstOrThrow()
    await prisma.platformSetting.update({
      where: { id: settings.id },
      data: { referralEnabled: false },
    })
    const referrer = await createUser({ emailPrefix: 'off_r' })
    const referee = await createUser({ emailPrefix: 'off_e', referredById: referrer.id })
    const deposit = await createApprovedDepositShell(referee.id, '100')
    const reward = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, deposit),
    )
    expect(reward).toBeNull()
    await enableReferrals('5', 30)
  })

  it('5. 5% reward calculation', async () => {
    await enableReferrals('5', 30)
    const referrer = await createUser({ emailPrefix: 'pct5_r' })
    const referee = await createUser({ emailPrefix: 'pct5_e', referredById: referrer.id })
    const deposit = await createApprovedDepositShell(referee.id, '100')
    const reward = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, {
        ...deposit,
        creditedAmount: moneyString(100),
      }),
    )
    expect(reward).not.toBeNull()
    expect(moneyString(reward!.rewardAmount)).toBe(moneyString(5))
    expect(d(reward!.percentApplied).toFixed(4)).toBe('5.0000')
  })

  it('6. custom admin percentage', async () => {
    await enableReferrals('12.5', 30)
    const referrer = await createUser({ emailPrefix: 'pct12_r' })
    const referee = await createUser({ emailPrefix: 'pct12_e', referredById: referrer.id })
    const deposit = await createApprovedDepositShell(referee.id, '80')
    const reward = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, deposit),
    )
    expect(moneyString(reward!.rewardAmount)).toBe(moneyString(10)) // 80 * 12.5%
    await enableReferrals('5', 30)
  })

  it('7. percentage snapshot unchanged after admin changes percent', async () => {
    await enableReferrals('5', 30)
    const referrer = await createUser({ emailPrefix: 'snap_r' })
    const referee = await createUser({ emailPrefix: 'snap_e', referredById: referrer.id })
    const deposit = await createApprovedDepositShell(referee.id, '100')
    const reward = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, deposit),
    )
    expect(d(reward!.percentApplied).toFixed(4)).toBe('5.0000')
    expect(moneyString(reward!.rewardAmount)).toBe(moneyString(5))
    await enableReferrals('9', 30)
    const again = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, deposit),
    )
    expect(again!.id).toBe(reward!.id)
    expect(d(again!.percentApplied).toFixed(4)).toBe('5.0000')
    expect(moneyString(again!.rewardAmount)).toBe(moneyString(5))
    await enableReferrals('5', 30)
  })

  it('8. two deposits → two rewards', async () => {
    await enableReferrals('5', 30)
    const referrer = await createUser({ emailPrefix: 'two_r' })
    const referee = await createUser({ emailPrefix: 'two_e', referredById: referrer.id })
    const d1 = await createApprovedDepositShell(referee.id, '100')
    const d2 = await createApprovedDepositShell(referee.id, '200')
    const r1 = await prisma.$transaction((tx) => referralService.createForApprovedDeposit(tx, d1))
    const r2 = await prisma.$transaction((tx) => referralService.createForApprovedDeposit(tx, d2))
    expect(r1!.id).not.toBe(r2!.id)
    expect(moneyString(r1!.rewardAmount)).toBe(moneyString(5))
    expect(moneyString(r2!.rewardAmount)).toBe(moneyString(10))
    expect(r1!.unlockAt.getTime()).not.toBe(r2!.unlockAt.getTime())
  })

  it('9. same deposit processed twice → ONE reward', async () => {
    await enableReferrals('5', 30)
    const referrer = await createUser({ emailPrefix: 'idem_r' })
    const referee = await createUser({ emailPrefix: 'idem_e', referredById: referrer.id })
    const deposit = await createApprovedDepositShell(referee.id, '100')
    const a = await prisma.$transaction((tx) => referralService.createForApprovedDeposit(tx, deposit))
    const b = await prisma.$transaction((tx) => referralService.createForApprovedDeposit(tx, deposit))
    expect(a!.id).toBe(b!.id)
    expect(await prisma.referralReward.count({ where: { sourceDepositId: deposit.id } })).toBe(1)
    const credits = await prisma.transaction.count({
      where: { idempotencyKey: `referral-reward:deposit:${deposit.id}` },
    })
    expect(credits).toBe(1)
  })

  it('10. OxaPay duplicate confirm path → ONE reward', async () => {
    await enableReferrals('5', 30)
    const referrer = await createUser({ emailPrefix: 'oxa_r' })
    const referee = await createUser({ emailPrefix: 'oxa_e', referredById: referrer.id })
    await ledgerService.ensureWalletsForUser(referee.id)
    const wallet = await prisma.wallet.findFirstOrThrow({
      where: { userId: referee.id, kind: 'INVESTMENT' },
    })
    const method =
      (await prisma.paymentMethod.findFirst({ where: { isActive: true } })) ??
      (await prisma.paymentMethod.create({
        data: {
          name: `Oxa ${randomUUID().slice(0, 4)}`,
          type: 'USDT_TRC20',
          instructions: 't',
          minAmount: moneyString(1),
          feePct: moneyString(0),
          isActive: true,
        },
      }))

    const deposit = await prisma.deposit.create({
      data: {
        reference: `DEP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
        userId: referee.id,
        walletId: wallet.id,
        paymentMethodId: method.id,
        amount: moneyString(50),
        fee: moneyString(0),
        status: 'UNDER_REVIEW',
        idempotencyKey: `oxa-ref-${randomUUID()}`,
      },
    })
    await prisma.$transaction(async (tx) => {
      await ledgerService.adjustPending(tx, wallet.id, d(50))
    })

    await depositService.confirmFromProvider(deposit.id, {
      eventId: `evt-${randomUUID()}`,
      amount: '50',
      context: {},
    })
    await depositService.confirmFromProvider(deposit.id, {
      eventId: `evt-${randomUUID()}`,
      amount: '50',
      context: {},
    })

    expect(await prisma.referralReward.count({ where: { sourceDepositId: deposit.id } })).toBe(1)
    expect(
      await prisma.transaction.count({
        where: { idempotencyKey: `referral-reward:deposit:${deposit.id}` },
      }),
    ).toBe(1)
  })

  it('11. locked reward cannot redeem', async () => {
    await enableReferrals('5', 30)
    const referrer = await createUser({ emailPrefix: 'lock_r' })
    const referee = await createUser({ emailPrefix: 'lock_e', referredById: referrer.id })
    const deposit = await createApprovedDepositShell(referee.id, '100')
    const reward = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, deposit),
    )
    await expect(referralService.redeem(referrer.id, reward!.id)).rejects.toMatchObject({
      message: expect.stringMatching(/locked/i),
    })
  })

  it('12. reward becomes available after unlockAt', async () => {
    await enableReferrals('5', 30)
    const referrer = await createUser({ emailPrefix: 'unl_r' })
    const referee = await createUser({ emailPrefix: 'unl_e', referredById: referrer.id })
    const deposit = await createApprovedDepositShell(referee.id, '100')
    const reward = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, deposit),
    )
    await prisma.referralReward.update({
      where: { id: reward!.id },
      data: { unlockAt: new Date(Date.now() - 1000) },
    })
    const n = await referralService.unlockEligibleRewards(prisma, { rewardId: reward!.id })
    expect(n).toBe(1)
    const updated = await prisma.referralReward.findUniqueOrThrow({ where: { id: reward!.id } })
    expect(updated.status).toBe('AVAILABLE')
  })

  it('13. available reward can redeem', async () => {
    await enableReferrals('5', 30)
    const referrer = await createUser({ emailPrefix: 'rdm_r' })
    const referee = await createUser({ emailPrefix: 'rdm_e', referredById: referrer.id })
    const deposit = await createApprovedDepositShell(referee.id, '100')
    const reward = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, deposit),
    )
    await prisma.referralReward.update({
      where: { id: reward!.id },
      data: { unlockAt: new Date(Date.now() - 1000), status: 'AVAILABLE' },
    })

    const beforeInv = await prisma.wallet.findFirstOrThrow({
      where: { userId: referrer.id, kind: 'INVESTMENT' },
    })
    const result = await referralService.redeem(referrer.id, reward!.id)
    expect(result.status).toBe('REDEEMED')
    expect(result.alreadyRedeemed).toBe(false)

    const afterInv = await prisma.wallet.findFirstOrThrow({
      where: { userId: referrer.id, kind: 'INVESTMENT' },
    })
    expect(d(afterInv.availableBalance).minus(d(beforeInv.availableBalance)).toFixed(8)).toBe(
      moneyString(5),
    )
  })

  it('14. redeem twice → ONE transfer', async () => {
    await enableReferrals('5', 30)
    const referrer = await createUser({ emailPrefix: 'twice_r' })
    const referee = await createUser({ emailPrefix: 'twice_e', referredById: referrer.id })
    const deposit = await createApprovedDepositShell(referee.id, '100')
    const reward = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, deposit),
    )
    await prisma.referralReward.update({
      where: { id: reward!.id },
      data: { unlockAt: new Date(Date.now() - 1000), status: 'AVAILABLE' },
    })
    const a = await referralService.redeem(referrer.id, reward!.id)
    const b = await referralService.redeem(referrer.id, reward!.id)
    expect(a.redeemedTransactionId).toBeTruthy()
    expect(b.alreadyRedeemed).toBe(true)
    expect(b.redeemedTransactionId).toBe(a.redeemedTransactionId)
    expect(
      await prisma.transaction.count({
        where: { idempotencyKey: `referral-redeem:reward:${reward!.id}` },
      }),
    ).toBe(1)
  })

  it('15. concurrent redeem → ONE transfer', async () => {
    await enableReferrals('5', 30)
    const referrer = await createUser({ emailPrefix: 'conc_r' })
    const referee = await createUser({ emailPrefix: 'conc_e', referredById: referrer.id })
    const deposit = await createApprovedDepositShell(referee.id, '100')
    const reward = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, deposit),
    )
    await prisma.referralReward.update({
      where: { id: reward!.id },
      data: { unlockAt: new Date(Date.now() - 1000), status: 'AVAILABLE' },
    })

    const results = await Promise.allSettled([
      referralService.redeem(referrer.id, reward!.id),
      referralService.redeem(referrer.id, reward!.id),
      referralService.redeem(referrer.id, reward!.id),
    ])
    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<{
      redeemedTransactionId: string | null
    }>[]
    expect(fulfilled.length).toBeGreaterThanOrEqual(1)
    const txnIds = new Set(fulfilled.map((r) => r.value.redeemedTransactionId))
    expect(txnIds.size).toBe(1)
    expect(
      await prisma.transaction.count({
        where: { idempotencyKey: `referral-redeem:reward:${reward!.id}` },
      }),
    ).toBe(1)
    const final = await prisma.referralReward.findUniqueOrThrow({ where: { id: reward!.id } })
    expect(final.status).toBe('REDEEMED')
  })

  it('16–17. referral does not enter ROI base or inflate investment balance', async () => {
    await enableReferrals('5', 30)
    const referrer = await createUser({ emailPrefix: 'roi_r' })
    const referee = await createUser({ emailPrefix: 'roi_e', referredById: referrer.id })
    await ledgerService.ensureWalletsForUser(referrer.id)
    const before = await prisma.wallet.findFirstOrThrow({
      where: { userId: referrer.id, kind: 'INVESTMENT' },
    })
    const deposit = await createApprovedDepositShell(referee.id, '100')
    await prisma.$transaction((tx) => referralService.createForApprovedDeposit(tx, deposit))
    const after = await prisma.wallet.findFirstOrThrow({
      where: { userId: referrer.id, kind: 'INVESTMENT' },
    })
    expect(moneyString(after.availableBalance)).toBe(moneyString(before.availableBalance))
    expect(moneyString(after.investedAmount)).toBe(moneyString(before.investedAmount))

    const wallets = await prisma.wallet.findMany({ where: { userId: referrer.id } })
    const mapped = mapWalletAggregate(wallets)
    const referral = wallets.find((w) => w.kind === 'REFERRAL')!
    expect(d(mapped.availableBalance).toFixed(2)).toBe(d(after.availableBalance).toFixed(2))
    expect(d(mapped.wallets.referral!.available).toFixed(2)).toBe(
      d(referral.availableBalance).toFixed(2),
    )
    expect(d(referral.availableBalance).gt(0)).toBe(true)
  })

  it('18–19. reward never negative; decimal precision correct', async () => {
    await enableReferrals('5', 30)
    const referrer = await createUser({ emailPrefix: 'dec_r' })
    const referee = await createUser({ emailPrefix: 'dec_e', referredById: referrer.id })
    const deposit = await createApprovedDepositShell(referee.id, '33.33')
    const reward = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, deposit),
    )
    // 33.33 * 5% = 1.6665
    expect(moneyString(reward!.rewardAmount)).toBe('1.66650000')
    expect(d(reward!.rewardAmount).gte(0)).toBe(true)

    const tiny = await createApprovedDepositShell(referee.id, '0.01')
    const tinyReward = await prisma.$transaction((tx) =>
      referralService.createForApprovedDeposit(tx, tiny),
    )
    expect(moneyString(tinyReward!.rewardAmount)).toBe('0.00050000')
  })
})
