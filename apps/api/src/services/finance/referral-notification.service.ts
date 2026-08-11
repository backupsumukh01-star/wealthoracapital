import { env } from '../../config/env.js'
import { prisma } from '../../database/prisma.js'
import { logger } from '../../utils/logger.js'
import { d, moneyDisplay } from '../../utils/money.js'
import { emailService } from '../../emails/email.service.js'
import { claimOpsNotificationDelivery } from '../ops-notification-delivery.service.js'
import { settingsService } from '../settings.service.js'

/**
 * Referral investor emails — prepared for enablement.
 * While PlatformSetting.referralEnabled is false, all methods no-op.
 * Never blocks finance/referral ledger paths.
 */
export const referralNotificationService = {
  async onEligibleAfterFirstApprovedDeposit(userId: string): Promise<void> {
    try {
      const settings = await settingsService.getOrInitPlatformSettings()
      if (!settings.referralEnabled) {
        logger.debug({ userId }, 'Referral notifications disabled; skip activation email')
        return
      }

      const claimed = await claimOpsNotificationDelivery(
        'EMAIL_REFERRAL',
        `referral.activation:${userId}`,
      )
      if (!claimed) return

      const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { email: true, firstName: true, referralCode: true },
      })
      if (!user?.referralCode) return

      const link = `${env.APP_URL.replace(/\/$/, '')}/register?ref=${encodeURIComponent(user.referralCode)}`
      const percent = d(settings.referralPercent).toFixed(2)
      const unlockDays = settings.referralUnlockDays

      await emailService.sendRaw({
        to: user.email,
        subject: 'Your Growzy referral programme is unlocked',
        text: [
          `Hi ${user.firstName},`,
          '',
          'Your first approved deposit unlocked the referral programme.',
          `Referral code: ${user.referralCode}`,
          `Referral link: ${link}`,
          `Commission: ${percent}% of each referred approved deposit`,
          `Lock period: ${unlockDays} days before redeem`,
          '',
          'Share your link. Rewards stay in your referral balance until you redeem them.',
        ].join('\n'),
        html: `<p>Hi ${user.firstName},</p>
<p>Your first approved deposit unlocked the referral programme.</p>
<ul>
<li>Referral code: <strong>${user.referralCode}</strong></li>
<li>Referral link: <a href="${link}">${link}</a></li>
<li>Commission: <strong>${percent}%</strong> of each referred approved deposit</li>
<li>Lock period: <strong>${unlockDays} days</strong> before redeem</li>
</ul>
<p>Share your link. Rewards stay in your referral balance until you redeem them.</p>`,
      })
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : 'referral_activation_failed', userId },
        'Referral activation email failed',
      )
    }
  },

  async onReferredUserRegistered(_input: {
    referrerId: string
    refereeId: string
  }): Promise<void> {
    try {
      const settings = await settingsService.getOrInitPlatformSettings()
      if (!settings.referralEnabled) return
      // Prepared: in-app / email can be added when programme is live.
      logger.debug(_input, 'Referral register notification prepared (no-op channel yet)')
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : 'referral_register_notify_failed' },
        'Referral register notification failed',
      )
    }
  },

  async onRewardCreated(rewardId: string): Promise<void> {
    try {
      const settings = await settingsService.getOrInitPlatformSettings()
      if (!settings.referralEnabled) {
        logger.debug({ rewardId }, 'Referral notifications disabled; skip reward email')
        return
      }

      const claimed = await claimOpsNotificationDelivery(
        'EMAIL_REFERRAL',
        `referral.reward.created:${rewardId}`,
      )
      if (!claimed) return

      const reward = await prisma.referralReward.findUnique({
        where: { id: rewardId },
        include: {
          referrer: { select: { email: true, firstName: true } },
          referee: { select: { firstName: true, lastName: true } },
        },
      })
      if (!reward) return

      const summary = await prisma.referralReward.findMany({
        where: { referrerId: reward.referrerId, status: 'LOCKED' },
        select: { rewardAmount: true },
      })
      let locked = d(0)
      for (const row of summary) locked = locked.plus(d(row.rewardAmount))

      const refereeName = `${reward.referee.firstName} ${reward.referee.lastName}`.trim()
      await emailService.sendRaw({
        to: reward.referrer.email,
        subject: 'You earned a Growzy referral reward',
        text: [
          `Hi ${reward.referrer.firstName},`,
          '',
          `Referred investor: ${refereeName}`,
          `Deposit amount: $${moneyDisplay(reward.sourceAmount)}`,
          `Referral percentage: ${d(reward.percentApplied).toFixed(2)}%`,
          `Reward amount: $${moneyDisplay(reward.rewardAmount)}`,
          `Unlock date: ${reward.unlockAt.toISOString().slice(0, 10)}`,
          `Locked referral total: $${moneyDisplay(locked)}`,
          '',
          'Rewards unlock automatically; redeem from your Referrals page.',
        ].join('\n'),
        html: `<p>Hi ${reward.referrer.firstName},</p>
<p>You earned a referral reward.</p>
<ul>
<li>Referred investor: <strong>${refereeName}</strong></li>
<li>Deposit amount: <strong>$${moneyDisplay(reward.sourceAmount)}</strong></li>
<li>Referral percentage: <strong>${d(reward.percentApplied).toFixed(2)}%</strong></li>
<li>Reward amount: <strong>$${moneyDisplay(reward.rewardAmount)}</strong></li>
<li>Unlock date: <strong>${reward.unlockAt.toISOString().slice(0, 10)}</strong></li>
<li>Locked referral total: <strong>$${moneyDisplay(locked)}</strong></li>
</ul>`,
      })
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : 'referral_reward_email_failed', rewardId },
        'Referral reward email failed',
      )
    }
  },

  async onRewardAvailable(rewardId: string): Promise<void> {
    try {
      const settings = await settingsService.getOrInitPlatformSettings()
      if (!settings.referralEnabled) return
      const claimed = await claimOpsNotificationDelivery(
        'EMAIL_REFERRAL',
        `referral.reward.available:${rewardId}`,
      )
      if (!claimed) return
      logger.debug({ rewardId }, 'Referral available notification prepared')
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : 'referral_available_failed', rewardId },
        'Referral available notification failed',
      )
    }
  },

  async onRewardRedeemed(rewardId: string): Promise<void> {
    try {
      const settings = await settingsService.getOrInitPlatformSettings()
      if (!settings.referralEnabled) return
      const claimed = await claimOpsNotificationDelivery(
        'EMAIL_REFERRAL',
        `referral.reward.redeemed:${rewardId}`,
      )
      if (!claimed) return
      logger.debug({ rewardId }, 'Referral redeem notification prepared')
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : 'referral_redeem_notify_failed', rewardId },
        'Referral redeem notification failed',
      )
    }
  },
}
