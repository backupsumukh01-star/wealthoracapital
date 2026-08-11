import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

import { prisma } from '../database/prisma.js'
import { claimOpsNotificationDelivery } from './ops-notification-delivery.service.js'
import { opsAlertService } from './ops-alert.service.js'
import { telegramService } from './telegram.service.js'
import { referralNotificationService } from './finance/referral-notification.service.js'
import { settingsService } from './settings.service.js'
import { moneyString } from '../utils/money.js'

describe('Phase 3F telegram + referral notification gates', () => {
  beforeAll(async () => {
    const settings = await settingsService.getOrInitPlatformSettings()
    await prisma.platformSetting.update({
      where: { id: settings.id },
      data: { referralEnabled: false, referralPercent: '5', referralUnlockDays: 30 },
    })
  })

  afterAll(async () => {
    const settings = await prisma.platformSetting.findFirst()
    if (settings) {
      await prisma.platformSetting.update({
        where: { id: settings.id },
        data: { referralEnabled: false },
      })
    }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('1–4. KYC/deposit/withdrawal telegram routes without failing finance', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    // Unconfigured bots → skip, never throw
    await expect(
      opsAlertService.notify({
        event: 'KYC_SUBMITTED',
        title: 'KYC submitted',
        action: 'test',
        userEmail: 'kyc@example.com',
        userName: 'Kyc User',
        reference: `kyc-${randomUUID()}`,
        idempotencyKey: `test.kyc.${randomUUID()}`,
      }),
    ).resolves.toBeUndefined()

    await expect(
      opsAlertService.notify({
        event: 'DEPOSIT_APPROVED',
        title: 'Deposit approved',
        action: 'test',
        amount: '100.00',
        reference: `DEP-${randomUUID().slice(0, 8)}`,
        idempotencyKey: `test.dep.${randomUUID()}`,
        details: { 'Auto-confirmed': 'yes', 'OxaPay track ID': 'track-1' },
      }),
    ).resolves.toBeUndefined()

    await expect(
      opsAlertService.notify({
        event: 'WITHDRAWAL_SUBMITTED',
        title: 'Withdrawal submitted',
        action: 'test',
        amount: '50.00',
        reference: `WD-${randomUUID().slice(0, 8)}`,
        idempotencyKey: `test.wd.${randomUUID()}`,
      }),
    ).resolves.toBeUndefined()

    // Direct send with no config must not throw
    await expect(telegramService.send('DEPOSIT', 'hello')).resolves.toEqual(
      expect.objectContaining({ skipped: true }),
    )
  })

  it('5–7+11. Referral notifications stay disabled when referralEnabled=false', async () => {
    const settings = await settingsService.adminGet()
    expect(settings.referral.enabled).toBe(false)

    await expect(
      referralNotificationService.onEligibleAfterFirstApprovedDeposit(randomUUID()),
    ).resolves.toBeUndefined()
    await expect(
      referralNotificationService.onRewardCreated(randomUUID()),
    ).resolves.toBeUndefined()
    await expect(referralNotificationService.onRewardRedeemed(randomUUID())).resolves.toBeUndefined()
    await expect(
      referralNotificationService.onReferredUserRegistered({
        referrerId: randomUUID(),
        refereeId: randomUUID(),
      }),
    ).resolves.toBeUndefined()
  })

  it('8. Duplicate delivery claim is idempotent', async () => {
    const key = `dup-${randomUUID()}`
    const first = await claimOpsNotificationDelivery('TELEGRAM_DEPOSIT', key)
    const second = await claimOpsNotificationDelivery('TELEGRAM_DEPOSIT', key)
    expect(first).toBe(true)
    expect(second).toBe(false)
  })

  it('8b. Concurrent claims for the same eventKey → exactly one winner', async () => {
    const key = `race-${randomUUID()}`
    const results = await Promise.all(
      Array.from({ length: 20 }, () => claimOpsNotificationDelivery('TELEGRAM_DEPOSIT', key)),
    )
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(results.filter((v) => v === false)).toHaveLength(19)
    expect(
      await prisma.opsNotificationDelivery.count({
        where: { channel: 'TELEGRAM_DEPOSIT', eventKey: key },
      }),
    ).toBe(1)
    // Losers remain clean duplicates (no throw); a follow-up claim stays false.
    await expect(claimOpsNotificationDelivery('TELEGRAM_DEPOSIT', key)).resolves.toBe(false)
  })

  it('9–10. Telegram/email failure does not throw through opsAlert', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    await expect(
      opsAlertService.notify({
        event: 'DEPOSIT_PROVIDER_VERIFIED',
        title: 'OxaPay verified',
        action: 'verified',
        reference: `DEP-${randomUUID().slice(0, 8)}`,
        idempotencyKey: `test.verify.${randomUUID()}`,
        amount: moneyString(25),
      }),
    ).resolves.toBeUndefined()
  })
})
