import type { EmailOutboxStatus, Prisma } from '@prisma/client'
import { randomBytes } from 'node:crypto'

import { prisma } from '../../database/prisma.js'
import { emailService } from '../../emails/email.service.js'
import { renderVariables } from '../../emails/render.js'
import { env } from '../../config/env.js'
import { badRequest, notFound } from '../../utils/errors.js'
import { logger } from '../../utils/logger.js'

const MAX_ATTEMPTS = 5

function token(): string {
  return randomBytes(16).toString('hex')
}

function mapOutbox(row: {
  id: string
  templateKey: string | null
  toEmail: string
  userId: string | null
  subject: string
  status: EmailOutboxStatus
  attempts: number
  lastError: string | null
  scheduledAt: Date | null
  sentAt: Date | null
  openedAt: Date | null
  clickedAt: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: row.id,
    templateKey: row.templateKey,
    to: row.toEmail,
    userId: row.userId,
    subject: row.subject,
    status: row.status,
    attempts: row.attempts,
    lastError: row.lastError,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    openedAt: row.openedAt?.toISOString() ?? null,
    clickedAt: row.clickedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export const emailOutboxService = {
  /** Enqueue an email; resolves a DB template by key when provided, else uses raw subject/html. */
  async enqueue(input: {
    templateKey?: string
    to: string
    userId?: string | null
    subject?: string
    html?: string
    text?: string
    variables?: Record<string, string>
    scheduledAt?: Date | null
  }) {
    let subject = input.subject ?? ''
    let html = input.html ?? ''
    let text = input.text ?? ''
    let templateId: string | null = null
    const variables = input.variables ?? {}

    if (input.templateKey) {
      const template = await prisma.emailTemplate.findUnique({ where: { key: input.templateKey } })
      if (!template || !template.isActive) {
        throw badRequest(`Email template "${input.templateKey}" is not available.`)
      }
      subject = renderVariables(template.subject, variables)
      html = renderVariables(template.bodyHtml, variables)
      text = template.bodyText ? renderVariables(template.bodyText, variables) : ''
      templateId = template.id
    }
    if (!subject || !html) {
      throw badRequest('Email requires a subject and body (template or raw content).')
    }

    const row = await prisma.emailOutbox.create({
      data: {
        templateId,
        templateKey: input.templateKey ?? null,
        toEmail: input.to,
        userId: input.userId ?? null,
        subject,
        bodyHtml: html,
        bodyText: text || null,
        variables: variables as Prisma.InputJsonValue,
        scheduledAt: input.scheduledAt ?? null,
        openToken: token(),
        clickToken: token(),
      },
    })
    return mapOutbox(row)
  },

  async list(query: { status?: EmailOutboxStatus; userId?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1
    const limit = Math.min(query.limit ?? 50, 100)
    const where: Prisma.EmailOutboxWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    }
    const [items, total] = await Promise.all([
      prisma.emailOutbox.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailOutbox.count({ where }),
    ])
    return {
      items: items.map(mapOutbox),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    }
  },

  async get(id: string) {
    const row = await prisma.emailOutbox.findUnique({ where: { id } })
    if (!row) throw notFound('Outbound email not found.')
    return mapOutbox(row)
  },

  async retry(id: string) {
    const row = await prisma.emailOutbox.findUnique({ where: { id } })
    if (!row) throw notFound('Outbound email not found.')
    const updated = await prisma.emailOutbox.update({
      where: { id },
      data: { status: 'QUEUED', attempts: 0, lastError: null, scheduledAt: null },
    })
    return mapOutbox(updated)
  },

  async cancel(id: string) {
    const row = await prisma.emailOutbox.findUnique({ where: { id } })
    if (!row) throw notFound('Outbound email not found.')
    const updated = await prisma.emailOutbox.update({ where: { id }, data: { status: 'CANCELLED' } })
    return mapOutbox(updated)
  },

  /** Drains the queue — invoked by the in-memory job queue on an interval (no Redis/BullMQ). */
  async processQueue(limit = 20): Promise<{ processed: number; sent: number; failed: number }> {
    const now = new Date()
    const due = await prisma.emailOutbox.findMany({
      where: {
        status: 'QUEUED',
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })

    let sent = 0
    let failed = 0
    for (const row of due) {
      await prisma.emailOutbox.update({ where: { id: row.id }, data: { status: 'SENDING' } })
      try {
        const trackedHtml = `${row.bodyHtml}<img src="${env.API_URL}/api/v1/emails/o/${row.openToken}" width="1" height="1" style="display:none" alt="" />`
        await emailService.sendRaw({ to: row.toEmail, subject: row.subject, html: trackedHtml, text: row.bodyText ?? '' })
        await prisma.emailOutbox.update({
          where: { id: row.id },
          data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 } },
        })
        sent += 1
      } catch (error) {
        const attempts = row.attempts + 1
        const message = error instanceof Error ? error.message : 'Unknown error'
        await prisma.emailOutbox.update({
          where: { id: row.id },
          data: {
            status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'QUEUED',
            attempts,
            lastError: message.slice(0, 1000),
          },
        })
        logger.error({ error, outboxId: row.id }, 'Email outbox delivery failed')
        failed += 1
      }
    }
    return { processed: due.length, sent, failed }
  },

  async trackOpen(openToken: string): Promise<void> {
    await prisma.emailOutbox.updateMany({
      where: { openToken, openedAt: null },
      data: { openedAt: new Date() },
    })
  },

  async trackClick(clickToken: string): Promise<void> {
    await prisma.emailOutbox.updateMany({
      where: { clickToken, clickedAt: null },
      data: { clickedAt: new Date() },
    })
  },
}
