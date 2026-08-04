import type { Prisma } from '@prisma/client'

import { prisma } from '../../database/prisma.js'
import { extractVariableNames, renderVariables } from '../../emails/render.js'
import { notFound } from '../../utils/errors.js'
import { auditService } from '../audit.service.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

function mapTemplate(row: {
  id: string
  key: string
  name: string
  category: string
  subject: string
  bodyHtml: string
  bodyText: string | null
  variables: Prisma.JsonValue | null
  isActive: boolean
  version: number
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    category: row.category,
    subject: row.subject,
    bodyHtml: row.bodyHtml,
    bodyText: row.bodyText,
    variables: Array.isArray(row.variables) ? (row.variables as string[]) : [],
    isActive: row.isActive,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export const emailTemplateService = {
  async list(query: { q?: string; category?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1
    const limit = Math.min(query.limit ?? 50, 100)
    const where: Prisma.EmailTemplateWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { key: { contains: query.q, mode: 'insensitive' } },
              { subject: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
    const [items, total] = await Promise.all([
      prisma.emailTemplate.findMany({
        where,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailTemplate.count({ where }),
    ])
    return {
      items: items.map(mapTemplate),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    }
  },

  async getByIdOrKey(idOrKey: string) {
    const row = await prisma.emailTemplate.findFirst({
      where: { OR: [{ id: idOrKey }, { key: idOrKey }] },
    })
    if (!row) throw notFound('Email template not found.')
    return mapTemplate(row)
  },

  async getRawByKey(key: string) {
    return prisma.emailTemplate.findUnique({ where: { key } })
  },

  async listVersions(idOrKey: string) {
    const template = await prisma.emailTemplate.findFirst({
      where: { OR: [{ id: idOrKey }, { key: idOrKey }] },
    })
    if (!template) throw notFound('Email template not found.')
    const versions = await prisma.emailTemplateVersion.findMany({
      where: { templateId: template.id },
      orderBy: { version: 'desc' },
    })
    return versions.map((v) => ({
      id: v.id,
      version: v.version,
      subject: v.subject,
      bodyHtml: v.bodyHtml,
      bodyText: v.bodyText,
      actorId: v.actorId,
      createdAt: v.createdAt.toISOString(),
    }))
  },

  async create(
    actorId: string,
    body: {
      key: string
      name: string
      category?: string
      subject: string
      bodyHtml: string
      bodyText?: string
    },
    context: Ctx,
  ) {
    const variables = [
      ...new Set([...extractVariableNames(body.subject), ...extractVariableNames(body.bodyHtml)]),
    ]
    const row = await prisma.emailTemplate.create({
      data: {
        key: body.key,
        name: body.name,
        category: body.category ?? 'SYSTEM',
        subject: body.subject,
        bodyHtml: body.bodyHtml,
        bodyText: body.bodyText ?? null,
        variables,
        updatedById: actorId,
      },
    })
    await auditService.record({
      actorId,
      action: 'email_template.create',
      module: 'email',
      newValue: { id: row.id, key: row.key },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapTemplate(row)
  },

  async update(
    actorId: string,
    id: string,
    body: Partial<{
      name: string
      category: string
      subject: string
      bodyHtml: string
      bodyText: string | null
      isActive: boolean
    }>,
    context: Ctx,
  ) {
    const existing = await prisma.emailTemplate.findUnique({ where: { id } })
    if (!existing) throw notFound('Email template not found.')

    const nextSubject = body.subject ?? existing.subject
    const nextHtml = body.bodyHtml ?? existing.bodyHtml
    const variables = [
      ...new Set([...extractVariableNames(nextSubject), ...extractVariableNames(nextHtml)]),
    ]

    const [, updated] = await prisma.$transaction([
      prisma.emailTemplateVersion.create({
        data: {
          templateId: existing.id,
          version: existing.version,
          subject: existing.subject,
          bodyHtml: existing.bodyHtml,
          bodyText: existing.bodyText,
          actorId,
        },
      }),
      prisma.emailTemplate.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.category !== undefined ? { category: body.category } : {}),
          ...(body.subject !== undefined ? { subject: body.subject } : {}),
          ...(body.bodyHtml !== undefined ? { bodyHtml: body.bodyHtml } : {}),
          ...(body.bodyText !== undefined ? { bodyText: body.bodyText } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          variables,
          version: { increment: 1 },
          updatedById: actorId,
        },
      }),
    ])

    await auditService.record({
      actorId,
      action: 'email_template.update',
      module: 'email',
      newValue: { id },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapTemplate(updated)
  },

  preview(idOrKeyTemplate: { subject: string; bodyHtml: string; bodyText?: string | null }, variables: Record<string, string>) {
    return {
      subject: renderVariables(idOrKeyTemplate.subject, variables),
      html: renderVariables(idOrKeyTemplate.bodyHtml, variables),
      text: idOrKeyTemplate.bodyText ? renderVariables(idOrKeyTemplate.bodyText, variables) : '',
    }
  },

  async previewById(idOrKey: string, variables: Record<string, string>) {
    const row = await prisma.emailTemplate.findFirst({
      where: { OR: [{ id: idOrKey }, { key: idOrKey }] },
    })
    if (!row) throw notFound('Email template not found.')
    return this.preview(row, variables)
  },

  async ensureSeeded(defaults: Array<{
    key: string
    name: string
    category: string
    subject: string
    bodyHtml: string
    bodyText: string
    variables: string[]
  }>) {
    for (const tpl of defaults) {
      const existing = await prisma.emailTemplate.findUnique({ where: { key: tpl.key } })
      if (existing) continue
      await prisma.emailTemplate.create({
        data: {
          key: tpl.key,
          name: tpl.name,
          category: tpl.category,
          subject: tpl.subject,
          bodyHtml: tpl.bodyHtml,
          bodyText: tpl.bodyText,
          variables: tpl.variables,
        },
      })
    }
  },
}
