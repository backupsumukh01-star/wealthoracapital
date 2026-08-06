import { randomBytes } from 'node:crypto'

import type { Prisma, ReportFormat, ReportStatus, ReportType } from '@prisma/client'

import { prisma } from '../../database/prisma.js'
import { notFound } from '../../utils/errors.js'
import { toCsv, toJson, toPdf, toSpreadsheetXml } from '../../utils/tabular-export.js'
import { filesService } from '../files.service.js'
import { storage } from '../storage/index.js'
import { activityService } from '../activity.service.js'
import { fetchReportRows } from './report-data.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

function reference(): string {
  return `RPT-${randomBytes(4).toString('hex').toUpperCase()}`
}

function extensionFor(format: ReportFormat): string {
  switch (format) {
    case 'CSV':
      return 'csv'
    case 'JSON':
      return 'json'
    case 'XLSX':
      return 'xls'
    case 'PDF':
      return 'pdf'
  }
}

function contentTypeFor(format: ReportFormat): string {
  switch (format) {
    case 'CSV':
      return 'text/csv'
    case 'JSON':
      return 'application/json'
    case 'XLSX':
      return 'application/vnd.ms-excel'
    case 'PDF':
      return 'application/pdf'
  }
}

function mapJob(job: {
  id: string
  reference: string
  type: ReportType
  format: ReportFormat
  status: ReportStatus
  fileName: string | null
  sizeBytes: number | null
  rowCount: number | null
  errorMessage: string | null
  createdAt: Date
  completedAt: Date | null
  fileKey: string | null
}) {
  return {
    jobId: job.id,
    reference: job.reference,
    type: job.type,
    format: job.format,
    status: job.status,
    fileName: job.fileName,
    sizeBytes: job.sizeBytes,
    rowCount: job.rowCount,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
    downloadUrl: job.fileKey ? filesService.buildDownloadUrl(job.fileKey) : null,
  }
}

export const reportService = {
  /** Synchronous generation — reports here are small enough that a queue isn't needed yet. */
  async generate(
    requestedById: string,
    input: { type: ReportType; format: ReportFormat; from?: string; to?: string; filters?: Record<string, string>; scope?: string },
    context: Ctx,
  ) {
    const job = await prisma.reportJob.create({
      data: {
        reference: reference(),
        type: input.type,
        format: input.format,
        status: 'PROCESSING',
        scope: input.scope ?? 'ADMIN',
        requestedById,
        params: { from: input.from, to: input.to, filters: input.filters ?? {} } as Prisma.InputJsonValue,
        startedAt: new Date(),
      },
    })

    try {
      const { rows, title } = await fetchReportRows(input.type, {
        from: input.from,
        to: input.to,
        status: input.filters?.status,
        // Investor-scoped exports must never pull platform-wide rows.
        userId: input.scope === 'INVESTOR' ? requestedById : input.filters?.userId,
        user: input.filters?.user,
        email: input.filters?.email,
        phone: input.filters?.phone,
        country: input.filters?.country,
        coin: input.filters?.coin,
        network: input.filters?.network,
        amount: input.filters?.amount,
        admin: input.filters?.admin,
      })

      let buffer: Buffer
      switch (input.format) {
        case 'CSV':
          buffer = Buffer.from(toCsv(rows), 'utf-8')
          break
        case 'JSON':
          buffer = Buffer.from(toJson(rows), 'utf-8')
          break
        case 'XLSX':
          buffer = Buffer.from(toSpreadsheetXml(rows, title), 'utf-8')
          break
        case 'PDF':
          buffer = toPdf(title, rows)
          break
      }

      const filename = `${job.reference}.${extensionFor(input.format)}`
      const stored = await storage.put({
        category: 'reports',
        filename,
        buffer,
        contentType: contentTypeFor(input.format),
      })

      const completed = await prisma.reportJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          fileKey: stored.key,
          fileName: filename,
          sizeBytes: buffer.byteLength,
          rowCount: rows.length,
          completedAt: new Date(),
        },
      })

      await activityService.record({
        userId: requestedById,
        actorId: requestedById,
        kind: 'REPORT_GENERATED',
        title: `Report generated: ${title}`,
        ip: context.ip,
        userAgent: context.userAgent,
      })

      return mapJob(completed)
    } catch (error) {
      const failed = await prisma.reportJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message.slice(0, 900) : 'Report generation failed.',
          completedAt: new Date(),
        },
      })
      return mapJob(failed)
    }
  },

  async list(query: { type?: ReportType; status?: ReportStatus; requestedById?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1
    const limit = query.limit ?? 30
    const where: Prisma.ReportJobWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.requestedById ? { requestedById: query.requestedById } : {}),
    }
    const [items, total] = await Promise.all([
      prisma.reportJob.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.reportJob.count({ where }),
    ])
    return {
      items: items.map(mapJob),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    }
  },

  async get(id: string) {
    const job = await prisma.reportJob.findUnique({ where: { id } })
    if (!job) throw notFound('Report job not found.')
    return mapJob(job)
  },
}
