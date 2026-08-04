import { createHash } from 'node:crypto'

import type { MediaKind, Prisma } from '@prisma/client'

import { prisma } from '../database/prisma.js'
import { notFound } from '../utils/errors.js'
import { storage } from './storage/index.js'
import { activityService } from './activity.service.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

function inferKind(contentType: string): MediaKind {
  if (contentType.startsWith('image/')) return 'IMAGE'
  if (contentType.startsWith('video/')) return 'VIDEO'
  if (contentType === 'application/pdf' || contentType.startsWith('application/')) return 'DOCUMENT'
  return 'OTHER'
}

function mapAsset(row: {
  id: string
  name: string
  folder: string
  kind: MediaKind
  mimeType: string
  sizeBytes: number
  storageKey: string
  url: string
  usedBy: string | null
  description: string | null
  checksumSha256: string | null
  createdById: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: row.id,
    name: row.name,
    folder: row.folder,
    kind: row.kind,
    mimeType: row.mimeType,
    size: row.sizeBytes,
    key: row.storageKey,
    url: row.url,
    usedBy: row.usedBy,
    description: row.description,
    checksum: row.checksumSha256,
    createdById: row.createdById,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function getOrThrow(id: string) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } })
  if (!asset) throw notFound('Media asset not found.')
  return asset
}

export const mediaService = {
  async upload(
    actorId: string,
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number },
    folder: string,
    context: Ctx,
  ) {
    const stored = await storage.put({
      category: 'media',
      filename: file.originalname,
      buffer: file.buffer,
      contentType: file.mimetype,
    })
    const asset = await prisma.mediaAsset.create({
      data: {
        name: file.originalname,
        folder: folder || 'Uploads',
        kind: inferKind(file.mimetype),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: stored.key,
        url: stored.url,
        checksumSha256: createHash('sha256').update(file.buffer).digest('hex'),
        createdById: actorId,
      },
    })
    await activityService.record({
      userId: actorId,
      actorId,
      kind: 'MEDIA_UPLOADED',
      title: `Media uploaded: ${file.originalname}`,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapAsset(asset)
  },

  async list(query: { folder?: string; q?: string; kind?: MediaKind; includeDeleted?: boolean; page?: number; limit?: number }) {
    const page = query.page ?? 1
    const limit = query.limit ?? 40
    const where: Prisma.MediaAssetWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.folder ? { folder: query.folder } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
    }
    const [items, total] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.mediaAsset.count({ where }),
    ])
    return {
      items: items.map(mapAsset),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    }
  },

  async listFolders() {
    const rows = await prisma.mediaAsset.findMany({
      where: { deletedAt: null },
      distinct: ['folder'],
      select: { folder: true },
    })
    return rows.map((r) => r.folder)
  },

  async get(id: string) {
    return mapAsset(await getOrThrow(id))
  },

  async rename(id: string, name: string) {
    await getOrThrow(id)
    return mapAsset(await prisma.mediaAsset.update({ where: { id }, data: { name } }))
  },

  async move(id: string, folder: string) {
    await getOrThrow(id)
    return mapAsset(await prisma.mediaAsset.update({ where: { id }, data: { folder } }))
  },

  async updateMetadata(id: string, body: { description?: string | null; usedBy?: string | null }) {
    await getOrThrow(id)
    return mapAsset(await prisma.mediaAsset.update({ where: { id }, data: body }))
  },

  async softDelete(id: string, actorId: string, context: Ctx) {
    const existing = await getOrThrow(id)
    const updated = await prisma.mediaAsset.update({ where: { id }, data: { deletedAt: new Date() } })
    await activityService.record({
      userId: actorId,
      actorId,
      kind: 'MEDIA_DELETED',
      title: `Media deleted: ${existing.name}`,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapAsset(updated)
  },

  async restore(id: string) {
    await getOrThrow(id)
    return mapAsset(await prisma.mediaAsset.update({ where: { id }, data: { deletedAt: null } }))
  },

  async permanentlyDelete(id: string) {
    const existing = await getOrThrow(id)
    await storage.delete(existing.storageKey)
    await prisma.mediaAsset.delete({ where: { id } })
  },
}
