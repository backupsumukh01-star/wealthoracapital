import type { Notification, NotificationKind, Prisma } from '@prisma/client'

import { logger } from '../utils/logger.js'
import { notificationRepository } from '../repositories/notification.repository.js'
import { emailService } from '../emails/email.service.js'

/**
 * Maps the compact Prisma `NotificationKind` bucket down to the richer
 * `NotificationType` the frontend renders (icon/label/action-url logic).
 * Callers may override by passing `metadata.type` explicitly.
 */
const KIND_TO_DEFAULT_TYPE: Record<NotificationKind, string> = {
  SYSTEM: 'SYSTEM',
  SECURITY: 'ACCOUNT_SECURITY',
  ACCOUNT: 'SYSTEM',
  ADMIN: 'SYSTEM',
  FINANCE: 'DEPOSIT_SUBMITTED',
  TRADING: 'DAILY_PROFIT',
  SUPPORT: 'SUPPORT_TICKET_CREATED',
  MARKETING: 'MARKETING',
  BROADCAST: 'BROADCAST',
}

export type NotificationChannel = 'DATABASE' | 'EMAIL' | 'PUSH' | 'SMS' | 'WHATSAPP' | 'TELEGRAM'

function toDto(row: Notification) {
  const metadata = (row.metadata as Record<string, unknown> | null) ?? null
  const type = (metadata?.type as string | undefined) ?? KIND_TO_DEFAULT_TYPE[row.kind] ?? 'SYSTEM'
  const actionUrl = (metadata?.actionUrl as string | undefined) ?? null
  return {
    id: row.id,
    type,
    title: row.title,
    body: row.body,
    actionUrl,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

export const notificationService = {
  /**
   * Persists an in-app notification and optionally dispatches over other
   * channels. Only DATABASE and EMAIL actually deliver today; the rest are
   * logged stubs so the channel contract is stable for future providers.
   */
  async notify(input: {
    userId: string
    kind?: NotificationKind
    title: string
    body: string
    actionUrl?: string
    type?: string
    metadata?: Record<string, unknown>
    channels?: NotificationChannel[]
    email?: { to: string; subject?: string }
  }): Promise<void> {
    const channels = input.channels ?? ['DATABASE']
    const metadata: Record<string, unknown> = {
      ...(input.metadata ?? {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.actionUrl ? { actionUrl: input.actionUrl } : {}),
    }

    if (channels.includes('DATABASE')) {
      await notificationRepository.create({
        user: { connect: { id: input.userId } },
        kind: input.kind ?? 'SYSTEM',
        title: input.title,
        body: input.body,
        ...(Object.keys(metadata).length > 0 ? { metadata: metadata as Prisma.InputJsonValue } : {}),
      })
    }

    if (channels.includes('EMAIL') && input.email?.to) {
      try {
        await emailService.sendRaw({
          to: input.email.to,
          subject: input.email.subject ?? input.title,
          html: `<p>${input.body}</p>`,
          text: input.body,
        })
      } catch (error) {
        logger.warn({ err: error }, 'Failed to send notification email')
      }
    }

    for (const channel of channels) {
      if (channel === 'PUSH' || channel === 'SMS' || channel === 'WHATSAPP' || channel === 'TELEGRAM') {
        logger.info({ channel, userId: input.userId }, 'Notification channel stub — not yet implemented')
      }
    }
  },

  async list(userId: string, options: { cursor?: string; unreadOnly?: boolean; take?: number }) {
    const rows = await notificationRepository.listPaged(userId, options)
    const take = options.take ?? 30
    const nextCursor = rows.length === take ? rows[rows.length - 1]?.createdAt.toISOString() ?? null : null
    return { items: rows.map(toDto), nextCursor }
  },

  listMine(userId: string) {
    return notificationRepository.listForUser(userId)
  },

  unreadCount(userId: string) {
    return notificationRepository.unreadCount(userId)
  },

  async markRead(id: string, userId: string) {
    const row = await notificationRepository.markRead(id, userId)
    return toDto(row)
  },

  async markAllRead(userId: string) {
    await notificationRepository.markAllRead(userId)
  },

  async archive(id: string, userId: string) {
    await notificationRepository.remove(id, userId)
  },
}
