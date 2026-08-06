import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'
import { emailService } from '../emails/email.service.js'
import { activityService } from './activity.service.js'
import { auditService } from './audit.service.js'
import { prisma } from '../database/prisma.js'

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
  | 'DEPOSIT_APPROVED'
  | 'DEPOSIT_REJECTED'
  | 'WITHDRAWAL_SUBMITTED'
  | 'WITHDRAWAL_APPROVED'
  | 'WITHDRAWAL_REJECTED'
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
  /** Also write platform activity for the live feed (requires userId). */
  recordActivity?: boolean
  activityKind?: import('@prisma/client').ActivityKind
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

/**
 * Owner / ops alert fan-out via ADMIN_ALERT_EMAILS.
 * Never throws to callers — alerts must not break money/KYC flows.
 */
export const opsAlertService = {
  recipients,

  async notify(payload: OpsAlertPayload): Promise<void> {
    try {
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
      if (payload.details) {
        for (const [k, v] of Object.entries(payload.details)) {
          if (v === null || v === undefined || v === '') continue
          rows.push([k, String(v)])
        }
      }
      rows.push(['Admin link', link])

      const alertBody = rows.map(([k, v]) => `${k}: ${v}`).join('\n')

      if (to.length === 0) {
        logger.debug({ event: payload.event }, 'No ADMIN_ALERT_EMAILS; skipping ops alert')
      } else {
        for (const email of to) {
          await emailService.sendAdminAlert({
            to: email,
            alertTitle: payload.title,
            alertBody,
            reference: payload.reference ?? payload.userId ?? undefined,
            adminLink: link,
            fields: Object.fromEntries(rows),
          })
        }
      }

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
