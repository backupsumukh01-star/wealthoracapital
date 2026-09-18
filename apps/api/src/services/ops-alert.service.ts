import type { ActivityKind } from '@prisma/client'

import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'
import { emailService } from '../emails/email.service.js'
import { activityService } from './activity.service.js'
import { auditService } from './audit.service.js'
import { prisma } from '../database/prisma.js'
import { claimOpsNotificationDelivery } from './ops-notification-delivery.service.js'
import { telegramService, type TelegramBotKind } from './telegram.service.js'
import { moneyDisplay } from '../utils/money.js'

export type OpsAlertEvent =
  | 'USER_REGISTERED'
  | 'EMAIL_VERIFIED'
  | 'USER_LOGIN'
  | 'PASSWORD_RESET'
  | 'GOOGLE_LOGIN'
  | 'KYC_SUBMITTED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'DEPOSIT_SUBMITTED'
  | 'DEPOSIT_PROVIDER_VERIFIED'
  | 'DEPOSIT_APPROVED'
  | 'DEPOSIT_REJECTED'
  | 'WITHDRAWAL_SUBMITTED'
  | 'WITHDRAWAL_APPROVED'
  | 'WITHDRAWAL_REJECTED'
  | 'WITHDRAWAL_PAID'
  | 'WITHDRAWAL_CANCELLED'
  | 'INVESTMENT_CREATED'
  | 'INVESTMENT_CANCELLED'
  | 'ROI_DISTRIBUTED'
  | 'REFERRAL_COMMISSION_PAID'
  | 'SUPPORT_TICKET_CREATED'
  | 'SUPPORT_REPLY'
  | 'ADMIN_CREATED'
  | 'ADMIN_LOGIN'
  | 'WALLET_ADDRESS_CHANGED'
  | 'PAYMENT_METHOD_CHANGED'
  | 'SYSTEM_ERROR'
  | 'PAYMENT_WEBHOOK_FAILED'
  | 'BACKUP_FAILED'
  | 'STORAGE_ERROR'
  | 'DAILY_OWNER_REPORT'

export type OpsAlertPayload = {
  event: OpsAlertEvent
  title: string
  action: string
  userId?: string | null
  userName?: string | null
  userEmail?: string | null
  amount?: string | null
  reference?: string | null
  reason?: string | null
  ip?: string | null
  adminPath?: string | null
  details?: Record<string, string | number | null | undefined>
  /** Stable key for Telegram/email side-effect dedupe (not financial idempotency). */
  idempotencyKey?: string | null
  /** Also write platform activity for the live feed (requires userId). */
  recordActivity?: boolean
  activityKind?: ActivityKind
}

function recipients(): string[] {
  const raw = env.ADMIN_ALERT_EMAILS?.trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function adminUrl(path?: string | null): string {
  const base = env.APP_URL.replace(/\/$/, '')
  if (!path) return `${base}/admin`
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function formatWhen(d = new Date()) {
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toISOString().slice(11, 19) + 'Z',
  }
}

function preferredTelegramBot(event: OpsAlertEvent): TelegramBotKind | null {
  if (event.startsWith('KYC_')) return 'KYC'
  if (event.startsWith('DEPOSIT_') || event === 'PAYMENT_WEBHOOK_FAILED') return 'DEPOSIT'
  if (event.startsWith('WITHDRAWAL_')) return 'WITHDRAWAL'
  return null
}

/** Specific KYC/deposit/withdrawal bots when set; otherwise every configured bot. */
function telegramBotsForEvent(event: OpsAlertEvent): TelegramBotKind[] {
  const configured = telegramService.configuredKinds()
  if (configured.length === 0) return []
  const preferred = preferredTelegramBot(event)
  if (preferred && configured.includes(preferred)) return [preferred]
  return configured
}

function asDetails(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

async function enrichDepositDetails(
  reference: string | null | undefined,
  details: Record<string, string | number | null | undefined>,
): Promise<Record<string, string | number | null | undefined>> {
  if (!reference) return details
  const deposit = await prisma.deposit.findFirst({
    where: { reference },
    include: { paymentMethod: { select: { name: true, type: true } } },
  })
  if (!deposit) return details
  const meta = asDetails(deposit.submissionDetails)
  const next = { ...details }
  if (!next.Cryptocurrency && deposit.paymentMethod?.name) {
    next.Cryptocurrency = deposit.paymentMethod.name
  }
  if (!next.Network) {
    next.Network =
      (typeof meta.network === 'string' && meta.network) ||
      (typeof meta.expectedNetwork === 'string' && meta.expectedNetwork) ||
      null
  }
  if (!next['OxaPay track ID'] && typeof meta.oxapayTrackId === 'string') {
    next['OxaPay track ID'] = meta.oxapayTrackId
  }
  if (!next['Transaction hash'] && deposit.txHash) {
    next['Transaction hash'] = deposit.txHash
  }
  if (!next['Auto-confirmed'] && meta.oxapayConfirmedAt) {
    next['Auto-confirmed'] = 'yes'
  }
  if (!next.Amount) {
    next.Amount = moneyDisplay(deposit.creditedAmount ?? deposit.amount)
  }
  return next
}

function formatTelegramText(rows: Array<[string, string]>, title: string): string {
  const lines = [`Wealthora · ${title}`, '']
  for (const [k, v] of rows) {
    lines.push(`${k}: ${v}`)
  }
  return lines.join('\n')
}

/**
 * Owner / ops alert fan-out via ADMIN_ALERT_EMAILS + Telegram bots.
 * Never throws to callers — alerts must not break money/KYC flows.
 */
export const opsAlertService = {
  recipients,

  async notify(payload: OpsAlertPayload): Promise<void> {
    try {
      if (
        payload.userId &&
        (payload.event.startsWith('DEPOSIT_') || payload.event.startsWith('WITHDRAWAL_'))
      ) {
        const demo = await prisma.user.findFirst({
          where: { id: payload.userId, createdByAdminId: { not: null }, deletedAt: null },
          select: { id: true },
        })
        if (demo) {
          logger.debug(
            { event: payload.event, userId: payload.userId },
            'Skipping ops alert for admin-created demo investor',
          )
          return
        }
      }

      const to = recipients()
      const when = formatWhen()
      let userName = payload.userName ?? null
      let userEmail = payload.userEmail ?? null

      if (payload.userId && (!userName || !userEmail)) {
        const user = await prisma.user.findFirst({
          where: { id: payload.userId, deletedAt: null },
          select: { firstName: true, lastName: true, email: true },
        })
        if (user) {
          userName = userName ?? `${user.firstName} ${user.lastName}`.trim()
          userEmail = userEmail ?? user.email
        }
      }

      let details = { ...(payload.details ?? {}) }
      if (
        payload.event === 'DEPOSIT_APPROVED' ||
        payload.event === 'DEPOSIT_PROVIDER_VERIFIED' ||
        payload.event === 'DEPOSIT_SUBMITTED'
      ) {
        details = await enrichDepositDetails(payload.reference, details)
      }

      const link = adminUrl(payload.adminPath)
      const rows: Array<[string, string]> = [
        ['Event', payload.event],
        ['Action', payload.action],
        ['Date', when.date],
        ['Time', when.time],
      ]
      if (userName) rows.push(['User name', userName])
      if (payload.userId) rows.push(['User ID', payload.userId])
      if (userEmail) rows.push(['Email', userEmail])
      if (payload.amount) rows.push(['Amount', payload.amount])
      if (payload.reference) rows.push(['Reference', payload.reference])
      if (payload.reason) rows.push(['Reason', payload.reason])
      if (payload.ip) rows.push(['IP', payload.ip])
      for (const [k, v] of Object.entries(details)) {
        if (v === null || v === undefined || v === '') continue
        // Never relay secrets / OTP-looking keys
        const keyLower = k.toLowerCase()
        if (
          keyLower.includes('otp') ||
          keyLower.includes('password') ||
          keyLower.includes('token') ||
          keyLower.includes('secret') ||
          keyLower.includes('account number') ||
          keyLower.includes('iban') ||
          keyLower.includes('document')
        ) {
          continue
        }
        rows.push([k, String(v)])
      }
      rows.push(['Admin link', link])

      const alertBody = rows.map(([k, v]) => `${k}: ${v}`).join('\n')

      // Email and Telegram must not block each other (Resend 429 currently
      // throws and was swallowing Telegram entirely).
      await Promise.all([
        (async () => {
          if (to.length === 0) {
            logger.debug({ event: payload.event }, 'No ADMIN_ALERT_EMAILS; skipping ops alert email')
            return
          }
          for (const email of to) {
            try {
              await emailService.sendAdminAlert({
                to: email,
                alertTitle: payload.title,
                alertBody,
                reference: payload.reference ?? payload.userId ?? undefined,
                adminLink: link,
                fields: Object.fromEntries(rows),
              })
            } catch (err) {
              logger.warn(
                { err, event: payload.event },
                'ops alert email failed; Telegram still attempted',
              )
            }
          }
        })(),
        (async () => {
          try {
            const bots = telegramBotsForEvent(payload.event)
            if (bots.length === 0) {
              logger.debug({ event: payload.event }, 'No Telegram bots configured; skipping')
              return
            }
            const eventKey =
              payload.idempotencyKey?.trim() ||
              `${payload.event}:${payload.reference ?? payload.userId ?? 'na'}:${when.date}:${when.time}`
            const text = formatTelegramText(rows, payload.title)
            for (const bot of bots) {
              const claimed = await claimOpsNotificationDelivery(`TELEGRAM_${bot}`, eventKey)
              if (!claimed) {
                logger.debug({ event: payload.event, eventKey }, 'Telegram alert deduped')
                continue
              }
              await telegramService.send(bot, text)
            }
          } catch (err) {
            logger.warn({ err, event: payload.event }, 'ops alert telegram failed')
          }
        })(),
      ])

      if (payload.recordActivity && payload.userId) {
        await activityService.record({
          userId: payload.userId,
          kind: payload.activityKind ?? 'ADMIN_ACTION',
          title: payload.title,
          description: payload.action,
          metadata: {
            event: payload.event,
            reference: payload.reference ?? null,
            amount: payload.amount ?? null,
          },
          ip: payload.ip,
        })
      }

      await auditService.record({
        actorId: payload.userId ?? null,
        targetUserId: payload.userId ?? null,
        action: `ops_alert.${payload.event.toLowerCase()}`,
        module: 'ops',
        newValue: {
          event: payload.event,
          title: payload.title,
          reference: payload.reference ?? null,
        },
        reason: payload.reason ?? null,
        ip: payload.ip ?? null,
      })
    } catch (err) {
      logger.warn({ err, event: payload.event }, 'opsAlertService.notify failed')
    }
  },
}
