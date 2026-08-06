import { randomUUID } from 'node:crypto'

import type { CmsStatus, DownloadVisibility, Prisma } from '@prisma/client'

import { prisma } from '../../database/prisma.js'
import { badRequest, notFound } from '../../utils/errors.js'
import { activityService } from '../activity.service.js'
import { auditService } from '../audit.service.js'
import { storage } from '../storage/index.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

function assertAllowedMime(mimetype: string, filename: string) {
  const lower = filename.toLowerCase()
  const byExt =
    lower.endsWith('.pdf') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.csv') ||
    lower.endsWith('.zip') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif')
  if (!ALLOWED_MIME.has(mimetype) && !byExt) {
    throw badRequest(`Unsupported file type: ${mimetype || filename}`)
  }
}

function mapRow(row: {
  id: string
  title: string
  description: string | null
  category: string
  thumbnailUrl: string | null
  buttonLabel: string
  version: string
  publishDate: Date | null
  visibility: DownloadVisibility
  sortOrder: number
  status: CmsStatus
  fileName: string
  mimeType: string
  sizeBytes: number
  storageKey: string
  url: string
  mediaAssetId: string | null
  createdById: string | null
  createdByName: string | null
  downloadCount: number
  archivedAt: Date | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    thumbnailUrl: row.thumbnailUrl,
    buttonLabel: row.buttonLabel,
    version: row.version,
    publishDate: row.publishDate?.toISOString() ?? null,
    visibility: row.visibility,
    sortOrder: row.sortOrder,
    status: row.status,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sizeLabel:
      row.sizeBytes >= 1_048_576
        ? `${(row.sizeBytes / 1_048_576).toFixed(1)} MB`
        : `${Math.max(1, Math.round(row.sizeBytes / 1024))} KB`,
    storageKey: row.storageKey,
    url: row.url,
    mediaAssetId: row.mediaAssetId,
    createdById: row.createdById,
    createdByName: row.createdByName,
    downloadCount: row.downloadCount,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export type DownloadListQuery = {
  q?: string
  category?: string
  status?: string
  page?: number
  pageSize?: number
}

export const cmsDownloadService = {
  async listAdmin(query: DownloadListQuery) {
    const page = Math.max(1, query.page ?? 1)
    const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 12))
    const where: Prisma.CmsDownloadWhereInput = { deletedAt: null }
    if (query.status && query.status !== 'ALL') {
      where.status = query.status as CmsStatus
    }
    if (query.category && query.category !== 'ALL') {
      where.category = query.category
    }
    if (query.q?.trim()) {
      const q = query.q.trim()
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { fileName: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ]
    }
    const [total, rows] = await Promise.all([
      prisma.cmsDownload.count({ where }),
      prisma.cmsDownload.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])
    return {
      items: rows.map(mapRow),
      total,
      page,
      pageSize,
      categories: await prisma.cmsDownload.findMany({
        where: { deletedAt: null },
        distinct: ['category'],
        select: { category: true },
        orderBy: { category: 'asc' },
      }).then((r) => r.map((x) => x.category)),
    }
  },

  async listPublic(opts: { includeAuthenticated?: boolean }) {
    const visibility: DownloadVisibility[] = opts.includeAuthenticated
      ? ['PUBLIC', 'AUTHENTICATED']
      : ['PUBLIC']
    const rows = await prisma.cmsDownload.findMany({
      where: {
        deletedAt: null,
        archivedAt: null,
        status: 'PUBLISHED',
        visibility: { in: visibility },
      },
      orderBy: [{ sortOrder: 'asc' }, { publishDate: 'desc' }],
    })
    return rows.map(mapRow)
  },

  async get(id: string) {
    const row = await prisma.cmsDownload.findFirst({ where: { id, deletedAt: null } })
    if (!row) throw notFound('Download not found.')
    return mapRow(row)
  },

  async create(
    actor: { id: string; name?: string | null },
    meta: {
      title: string
      description?: string
      category?: string
      thumbnailUrl?: string
      buttonLabel?: string
      version?: string
      publishDate?: string | null
      visibility?: DownloadVisibility
      sortOrder?: number
      status?: CmsStatus
    },
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number },
    context: Ctx,
  ) {
    assertAllowedMime(file.mimetype, file.originalname)
    const stored = await storage.put({
      category: 'reports',
      filename: file.originalname,
      buffer: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
    })
    const id = randomUUID()
    const status = meta.status ?? 'DRAFT'
    const row = await prisma.cmsDownload.create({
      data: {
        id,
        title: meta.title.trim() || file.originalname.replace(/\.[^.]+$/, ''),
        description: meta.description?.trim() || null,
        category: meta.category?.trim() || 'General',
        thumbnailUrl: meta.thumbnailUrl?.trim() || null,
        buttonLabel: meta.buttonLabel?.trim() || 'Download',
        version: meta.version?.trim() || '1.0',
        publishDate: meta.publishDate ? new Date(meta.publishDate) : status === 'PUBLISHED' ? new Date() : null,
        visibility: meta.visibility ?? 'PUBLIC',
        sortOrder: meta.sortOrder ?? 0,
        status,
        fileName: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        sizeBytes: file.size,
        storageKey: stored.key,
        url: stored.url,
        createdById: actor.id,
        createdByName: actor.name ?? null,
      },
    })
    await auditService.record({
      actorId: actor.id,
      action: 'cms.download.create',
      module: 'cms',
      newValue: { id: row.id, title: row.title },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapRow(row)
  },

  async updateMeta(
    id: string,
    actorId: string,
    patch: Partial<{
      title: string
      description: string | null
      category: string
      thumbnailUrl: string | null
      buttonLabel: string
      version: string
      publishDate: string | null
      visibility: DownloadVisibility
      sortOrder: number
      status: CmsStatus
    }>,
    context: Ctx,
  ) {
    const existing = await prisma.cmsDownload.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw notFound('Download not found.')
    const data: Prisma.CmsDownloadUpdateInput = {}
    if (patch.title !== undefined) data.title = patch.title.trim()
    if (patch.description !== undefined) data.description = patch.description?.trim() || null
    if (patch.category !== undefined) data.category = patch.category.trim() || 'General'
    if (patch.thumbnailUrl !== undefined) data.thumbnailUrl = patch.thumbnailUrl?.trim() || null
    if (patch.buttonLabel !== undefined) data.buttonLabel = patch.buttonLabel.trim() || 'Download'
    if (patch.version !== undefined) data.version = patch.version.trim() || '1.0'
    if (patch.publishDate !== undefined) {
      data.publishDate = patch.publishDate ? new Date(patch.publishDate) : null
    }
    if (patch.visibility !== undefined) data.visibility = patch.visibility
    if (patch.sortOrder !== undefined) data.sortOrder = patch.sortOrder
    if (patch.status !== undefined) {
      data.status = patch.status
      if (patch.status === 'PUBLISHED' && !existing.publishDate && patch.publishDate === undefined) {
        data.publishDate = new Date()
      }
      if (patch.status === 'ARCHIVED') data.archivedAt = new Date()
      if (patch.status === 'DRAFT' || patch.status === 'PUBLISHED') data.archivedAt = null
    }
    const row = await prisma.cmsDownload.update({ where: { id }, data })
    await auditService.record({
      actorId,
      action: 'cms.download.update',
      module: 'cms',
      newValue: { id, ...patch },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapRow(row)
  },

  async replaceFile(
    id: string,
    actor: { id: string; name?: string | null },
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number },
    context: Ctx,
    versionBump?: string,
  ) {
    const existing = await prisma.cmsDownload.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw notFound('Download not found.')
    assertAllowedMime(file.mimetype, file.originalname)
    const stored = await storage.put({
      category: 'reports',
      filename: file.originalname,
      buffer: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
    })
    const row = await prisma.cmsDownload.update({
      where: { id },
      data: {
        fileName: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        sizeBytes: file.size,
        storageKey: stored.key,
        url: stored.url,
        version: versionBump?.trim() || existing.version,
        updatedAt: new Date(),
      },
    })
    await activityService.record({
      userId: actor.id,
      actorId: actor.id,
      kind: 'CMS_PUBLISHED',
      title: `Download replaced · ${row.title}`,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapRow(row)
  },

  async publish(id: string, actorId: string, context: Ctx) {
    return this.updateMeta(id, actorId, { status: 'PUBLISHED', publishDate: new Date().toISOString() }, context)
  },

  async archive(id: string, actorId: string, context: Ctx) {
    return this.updateMeta(id, actorId, { status: 'ARCHIVED' }, context)
  },

  async softDelete(id: string, actorId: string, context: Ctx) {
    const existing = await prisma.cmsDownload.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw notFound('Download not found.')
    const row = await prisma.cmsDownload.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    })
    await auditService.record({
      actorId,
      action: 'cms.download.delete',
      module: 'cms',
      newValue: { id },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapRow(row)
  },

  async reorder(ids: string[], actorId: string, context: Ctx) {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.cmsDownload.updateMany({
          where: { id, deletedAt: null },
          data: { sortOrder: index },
        }),
      ),
    )
    await auditService.record({
      actorId,
      action: 'cms.download.reorder',
      module: 'cms',
      newValue: { ids },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return this.listAdmin({ page: 1, pageSize: 100 })
  },

  async recordHit(id: string) {
    await prisma.cmsDownload.updateMany({
      where: { id, deletedAt: null, status: 'PUBLISHED' },
      data: { downloadCount: { increment: 1 } },
    })
  },
}
