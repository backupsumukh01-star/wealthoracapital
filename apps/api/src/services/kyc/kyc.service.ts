import type {
  ActivityKind,
  KycDocumentSide,
  KycDocumentType,
  KycHistoryAction,
  KycReviewDecision,
  KycStatus,
  Prisma,
} from '@prisma/client'
import { createHash, randomBytes } from 'node:crypto'

import { kycRepository } from '../../repositories/kyc.repository.js'
import { userRepository } from '../../repositories/user.repository.js'
import { badRequest, forbidden, notFound } from '../../utils/errors.js'
import { activityService } from '../activity.service.js'
import { auditService } from '../audit.service.js'
import { notificationService } from '../notification.service.js'
import { storage } from '../storage/index.js'
import { mapSubmission, toKycProfile } from './kyc.mapper.js'
import { assessKycRisk } from './risk-engine.js'
import { virusScanner } from './virus-scan.js'

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
])
const MAX_BYTES = 8 * 1024 * 1024

const EDITABLE: KycStatus[] = ['PENDING', 'NEED_MORE_INFO', 'REJECTED']
const LOCKED: KycStatus[] = ['SUBMITTED', 'UNDER_REVIEW']

function referenceId(): string {
  return `KYC-${randomBytes(4).toString('hex').toUpperCase()}`
}

function assertAdult(dateOfBirth: string): Date {
  const dob = new Date(`${dateOfBirth}T00:00:00.000Z`)
  if (Number.isNaN(dob.getTime())) {
    throw badRequest('Invalid date of birth.')
  }
  const now = new Date()
  let age = now.getUTCFullYear() - dob.getUTCFullYear()
  const m = now.getUTCMonth() - dob.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1
  if (age < 18) {
    throw badRequest('You must be at least 18 years old to complete KYC.')
  }
  return dob
}

function requiredDocuments(primary: KycDocumentType | null | undefined): Array<{
  type: KycDocumentType
  side: KycDocumentSide
}> {
  const idType = primary ?? 'NATIONAL_ID'
  const req: Array<{ type: KycDocumentType; side: KycDocumentSide }> = [
    { type: 'SELFIE', side: 'SINGLE' },
  ]
  if (idType === 'PASSPORT') {
    req.push({ type: 'PASSPORT', side: 'FRONT' })
  } else {
    req.push({ type: idType, side: 'FRONT' }, { type: idType, side: 'BACK' })
  }
  return req
}

async function appendHistory(
  submissionId: string,
  action: KycHistoryAction,
  actorId: string | null,
  message?: string,
  metadata?: Record<string, unknown>,
) {
  await kycRepository.createHistory({
    submission: { connect: { id: submissionId } },
    action,
    actorId,
    message: message ?? null,
    ...(metadata ? { metadata: metadata as Prisma.InputJsonValue } : {}),
  })
}

async function notifyKyc(userId: string, title: string, body: string) {
  await notificationService.notify({
    userId,
    kind: 'ACCOUNT',
    title,
    body,
  })
}

async function recordActivity(
  userId: string,
  actorId: string,
  kind: ActivityKind,
  title: string,
  context: { ip?: string | null; userAgent?: string | null },
) {
  await activityService.record({
    userId,
    actorId,
    kind,
    title,
    ip: context.ip,
    userAgent: context.userAgent,
  })
}

export const kycService = {
  async getStatus(userId: string) {
    const user = await userRepository.findById(userId)
    if (!user) throw notFound('User not found.')
    const submission = await kycRepository.findLatestByUser(userId)
    return {
      ...toKycProfile(submission, user.kycStatus),
      submission: submission ? mapSubmission(submission) : null,
    }
  },

  async upsertDraft(
    userId: string,
    input: {
      country: string
      dateOfBirth: string
      nationality?: string
      addressLine1?: string
      city?: string
      postalCode?: string
      occupation?: string
      primaryDocumentType?: KycDocumentType
    },
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const dob = assertAdult(input.dateOfBirth)
    const locked = await kycRepository.findActiveLock(userId)
    if (locked) {
      throw forbidden('KYC is locked while under review.')
    }

    const existing = await kycRepository.findEditableByUser(userId)
    let submissionId: string
    if (!existing) {
      const created = await kycRepository.createSubmission({
        referenceId: referenceId(),
        user: { connect: { id: userId } },
        status: 'PENDING',
        country: input.country,
        dateOfBirth: dob,
        nationality: input.nationality ?? input.country,
        addressLine1: input.addressLine1 ?? null,
        city: input.city ?? null,
        postalCode: input.postalCode ?? null,
        occupation: input.occupation ?? null,
        primaryDocumentType: input.primaryDocumentType ?? null,
      })
      submissionId = created.id
      await appendHistory(submissionId, 'CREATED', userId, 'KYC draft created')
      await kycRepository.syncUserKycStatus(userId, 'PENDING')
    } else {
      const updated = await kycRepository.updateSubmission(existing.id, {
        country: input.country,
        dateOfBirth: dob,
        nationality: input.nationality ?? input.country,
        addressLine1: input.addressLine1 ?? null,
        city: input.city ?? null,
        postalCode: input.postalCode ?? null,
        occupation: input.occupation ?? null,
        primaryDocumentType: input.primaryDocumentType ?? existing.primaryDocumentType,
        status: existing.status === 'REJECTED' ? 'PENDING' : existing.status,
      })
      submissionId = updated.id
      await appendHistory(submissionId, 'UPDATED', userId, 'KYC details updated')
    }

    await auditService.record({
      actorId: userId,
      targetUserId: userId,
      action: 'kyc.update',
      module: 'kyc',
      newValue: { submissionId },
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return this.getStatus(userId)
  },

  async uploadDocument(
    userId: string,
    meta: { documentType: KycDocumentType; side: KycDocumentSide },
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number },
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw badRequest('Unsupported file type. Use PNG, JPEG, JPG, WEBP, or PDF.')
    }
    if (file.size > MAX_BYTES) {
      throw badRequest('File exceeds the 8MB limit.')
    }

    const locked = await kycRepository.findActiveLock(userId)
    if (locked) throw forbidden('KYC is locked while under review.')

    let submission = await kycRepository.findEditableByUser(userId)
    if (!submission) {
      throw badRequest('Create or update your KYC profile before uploading documents.')
    }
    if (!EDITABLE.includes(submission.status)) {
      throw forbidden('Documents cannot be changed in the current KYC status.')
    }

    const checksum = createHash('sha256').update(file.buffer).digest('hex')
    const existingSame = submission.documents.find(
      (d) => d.documentType === meta.documentType && d.side === meta.side && !d.deletedAt,
    )
    const duplicate = await kycRepository.findDocumentByChecksum(checksum, submission.id)
    // Same type+side may be replaced; identical bytes on a different slot are blocked.
    if (duplicate && duplicate.id !== existingSame?.id) {
      throw badRequest('Duplicate document detected for this submission.')
    }

    const scan = await virusScanner.scan(file.buffer, file.originalname)
    if (scan.status === 'INFECTED') {
      throw badRequest('File failed virus scanning.')
    }

    const stored = await storage.put({
      category: 'kyc',
      filename: file.originalname,
      buffer: file.buffer,
      contentType: file.mimetype,
    })

    if (existingSame) {
      await kycRepository.softDeleteDocument(existingSame.id)
      await storage.delete(existingSame.storageKey)
    }

    await kycRepository.createDocument({
      submission: { connect: { id: submission.id } },
      documentType: meta.documentType,
      side: meta.side,
      storageKey: stored.key,
      originalName: file.originalname.slice(0, 200),
      mimeType: file.mimetype,
      sizeBytes: file.size,
      checksumSha256: checksum,
      virusScanStatus: scan.status,
    })

    await appendHistory(submission.id, 'DOCUMENT_UPLOADED', userId, `${meta.documentType} uploaded`, {
      side: meta.side,
      virusScanStatus: scan.status,
    })
    await auditService.record({
      actorId: userId,
      targetUserId: userId,
      action: 'kyc.document_upload',
      module: 'kyc',
      newValue: { documentType: meta.documentType, side: meta.side },
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return this.getStatus(userId)
  },

  async deleteDocument(
    userId: string,
    documentId: string,
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const doc = await kycRepository.findDocumentById(documentId)
    if (!doc || doc.submission.userId !== userId) {
      throw notFound('Document not found.')
    }
    if (LOCKED.includes(doc.submission.status) || doc.submission.status === 'APPROVED') {
      throw forbidden('Documents cannot be deleted in the current KYC status.')
    }

    await kycRepository.softDeleteDocument(documentId)
    await storage.delete(doc.storageKey)
    await appendHistory(doc.submissionId, 'DOCUMENT_DELETED', userId, 'Document deleted')
    await auditService.record({
      actorId: userId,
      targetUserId: userId,
      action: 'kyc.document_delete',
      module: 'kyc',
      oldValue: { documentId },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return this.getStatus(userId)
  },

  async submit(userId: string, context: { ip?: string | null; userAgent?: string | null }) {
    const locked = await kycRepository.findActiveLock(userId)
    if (locked) throw forbidden('A KYC submission is already under review.')

    const submission = await kycRepository.findEditableByUser(userId)
    if (!submission) throw badRequest('No KYC draft found to submit.')

    const docs = submission.documents.filter((d) => !d.deletedAt)
    const required = requiredDocuments(submission.primaryDocumentType)
    for (const req of required) {
      const ok = docs.some((d) => d.documentType === req.type && d.side === req.side)
      if (!ok) {
        throw badRequest(`Missing required document: ${req.type} (${req.side}).`)
      }
    }

    const risk = assessKycRisk({
      country: submission.country,
      documentTypes: docs.map((d) => d.documentType),
      fraudFlag: submission.fraudFlag,
      documentQuality: submission.documentQuality,
    })

    const updated = await kycRepository.updateSubmission(submission.id, {
      status: 'UNDER_REVIEW',
      submittedAt: new Date(),
      riskLevel: risk.level,
      riskScore: risk.score,
      rejectionReason: null,
      infoRequestMessage: null,
    })
    await kycRepository.syncUserKycStatus(userId, 'UNDER_REVIEW')
    await appendHistory(submission.id, 'SUBMITTED', userId, 'KYC submitted for review', {
      risk,
    })
    await appendHistory(submission.id, 'UNDER_REVIEW', userId, 'Moved to under review')
    await recordActivity(userId, userId, 'KYC_SUBMITTED', 'KYC submitted', context)
    await notifyKyc(userId, 'KYC submitted', 'Your verification documents are under review.')
    await auditService.record({
      actorId: userId,
      targetUserId: userId,
      action: 'kyc.submit',
      module: 'kyc',
      newValue: { submissionId: updated.id, status: 'UNDER_REVIEW', risk },
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return this.getStatus(userId)
  },

  async history(userId: string) {
    const submission = await kycRepository.findLatestByUser(userId)
    if (!submission) return { items: [] }
    const items = await kycRepository.listHistory(submission.id)
    return {
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        message: item.message,
        actorId: item.actorId,
        createdAt: item.createdAt.toISOString(),
      })),
    }
  },

  async listDocuments(userId: string) {
    const submission = await kycRepository.findLatestByUser(userId)
    if (!submission) return { items: [] }
    return {
      items: submission.documents.filter((d) => !d.deletedAt).map((d) => ({
        id: d.id,
        kind: d.documentType,
        documentType: d.documentType,
        side: d.side,
        status: d.status,
        downloadUrl: storage.createSignedDownloadUrl(d.storageKey),
        createdAt: d.createdAt.toISOString(),
      })),
    }
  },

  async adminList(input: {
    q?: string
    status?: KycStatus
    country?: string
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    reviewerId?: string
    documentType?: KycDocumentType
    from?: Date
    to?: Date
    page: number
    limit: number
    cursor?: string
    sortOrder: 'asc' | 'desc'
  }) {
    const where: Prisma.KycSubmissionWhereInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.country ? { country: input.country } : {}),
      ...(input.riskLevel ? { riskLevel: input.riskLevel } : {}),
      ...(input.reviewerId ? { assignedReviewerId: input.reviewerId } : {}),
      ...(input.documentType
        ? { documents: { some: { documentType: input.documentType, deletedAt: null } } }
        : {}),
      ...(input.from || input.to
        ? {
            createdAt: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {}),
            },
          }
        : {}),
      ...(input.q
        ? {
            OR: [
              { referenceId: { contains: input.q.toUpperCase() } },
              { user: { email: { contains: input.q, mode: 'insensitive' } } },
              { user: { firstName: { contains: input.q, mode: 'insensitive' } } },
              { user: { lastName: { contains: input.q, mode: 'insensitive' } } },
              ...(input.q.length === 2 ? [{ country: input.q.toUpperCase() }] : []),
            ],
          }
        : {}),
    }

    const skip = (input.page - 1) * input.limit
    const { items, total } = await kycRepository.listAdmin({
      where,
      skip,
      take: input.limit,
      cursor: input.cursor,
      sortOrder: input.sortOrder,
    })

    const mapped = items.map((row) => {
      const profile = toKycProfile(row)
      return {
        ...row.user,
        role: 'USER' as const,
        status: 'ACTIVE' as const,
        timezone: 'UTC',
        avatarUrl: null,
        emailVerified: true,
        createdAt: row.user.createdAt.toISOString(),
        kyc: profile,
        submission: mapSubmission(row),
      }
    })

    return {
      items: mapped,
      nextCursor: mapped.length === input.limit ? items[items.length - 1]?.id ?? null : null,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / input.limit)),
        hasNext: skip + mapped.length < total,
      },
    }
  },

  async resolveSubmission(id: string) {
    const byId = await kycRepository.findSubmissionById(id)
    if (byId) return byId
    const byUser = await kycRepository.findLatestByUser(id)
    if (byUser) {
      const full = await kycRepository.findSubmissionById(byUser.id)
      if (full) return full
    }
    return null
  },

  async adminGet(id: string) {
    const submission = await this.resolveSubmission(id)
    if (!submission) throw notFound('KYC submission not found.')
    return mapSubmission(submission)
  },

  async adminDecision(
    actorId: string,
    submissionId: string,
    decision: KycReviewDecision,
    body: {
      reason?: string
      internalNotes?: string
      riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      riskScore?: number
      fraudFlag?: boolean
      documentQuality?: number
      assignedReviewerId?: string
    },
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const submission = await this.resolveSubmission(submissionId)
    if (!submission) throw notFound('KYC submission not found.')

    const reviewable: KycStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO']
    const reopenable: KycStatus[] = ['REJECTED', 'EXPIRED', 'SUSPENDED', 'APPROVED']
    const expireable: KycStatus[] = ['APPROVED', 'UNDER_REVIEW', 'SUBMITTED', 'NEED_MORE_INFO']
    const suspendable: KycStatus[] = ['APPROVED', 'UNDER_REVIEW', 'SUBMITTED', 'NEED_MORE_INFO', 'PENDING']

    let nextStatus: KycStatus = submission.status
    let historyAction: KycHistoryAction = 'NOTE_ADDED'
    let activityKind: ActivityKind = 'ADMIN_ACTION'
    let notifyTitle = 'KYC update'
    let notifyBody = 'Your KYC status was updated.'

    switch (decision) {
      case 'APPROVE':
        if (!reviewable.includes(submission.status)) {
          throw badRequest('Only submitted / under-review KYC can be approved.')
        }
        nextStatus = 'APPROVED'
        historyAction = 'APPROVED'
        activityKind = 'KYC_APPROVED'
        notifyTitle = 'KYC approved'
        notifyBody = 'Your identity verification was approved.'
        break
      case 'REJECT':
        if (!reviewable.includes(submission.status)) {
          throw badRequest('Only submitted / under-review KYC can be rejected.')
        }
        if (!body.reason) throw badRequest('A rejection reason is required.')
        nextStatus = 'REJECTED'
        historyAction = 'REJECTED'
        activityKind = 'KYC_REJECTED'
        notifyTitle = 'KYC rejected'
        notifyBody = body.reason
        break
      case 'REQUEST_INFORMATION':
        if (!reviewable.includes(submission.status)) {
          throw badRequest('Only submitted / under-review KYC can request more information.')
        }
        if (!body.reason) throw badRequest('A message is required when requesting information.')
        nextStatus = 'NEED_MORE_INFO'
        historyAction = 'INFO_REQUESTED'
        activityKind = 'KYC_INFO_REQUESTED'
        notifyTitle = 'More information needed'
        notifyBody = body.reason
        break
      case 'EXPIRE':
        if (!expireable.includes(submission.status)) {
          throw badRequest('KYC cannot be expired from the current status.')
        }
        nextStatus = 'EXPIRED'
        historyAction = 'EXPIRED'
        activityKind = 'KYC_EXPIRED'
        notifyTitle = 'KYC expired'
        notifyBody = 'Your KYC submission has expired. Please submit again.'
        break
      case 'REOPEN':
        if (!reopenable.includes(submission.status)) {
          throw badRequest('Only closed KYC cases can be reopened.')
        }
        nextStatus = 'PENDING'
        historyAction = 'REOPENED'
        activityKind = 'KYC_REOPENED'
        notifyTitle = 'KYC reopened'
        notifyBody = 'Your KYC case was reopened. You can update and resubmit.'
        break
      case 'SUSPEND':
        if (!suspendable.includes(submission.status)) {
          throw badRequest('KYC cannot be suspended from the current status.')
        }
        nextStatus = 'SUSPENDED'
        historyAction = 'SUSPENDED'
        activityKind = 'KYC_SUSPENDED'
        notifyTitle = 'KYC suspended'
        notifyBody = body.reason ?? 'Your KYC verification has been suspended.'
        break
      default: {
        const _exhaustive: never = decision
        throw badRequest(`Unsupported decision: ${String(_exhaustive)}`)
      }
    }

    const updated = await kycRepository.updateSubmission(submission.id, {
      status: nextStatus,
      reviewedAt: new Date(),
      rejectionReason: decision === 'REJECT' ? body.reason ?? null : submission.rejectionReason,
      infoRequestMessage:
        decision === 'REQUEST_INFORMATION' ? body.reason ?? null : submission.infoRequestMessage,
      internalNotes: body.internalNotes ?? submission.internalNotes,
      riskLevel: body.riskLevel ?? submission.riskLevel,
      riskScore: body.riskScore ?? submission.riskScore,
      fraudFlag: body.fraudFlag ?? submission.fraudFlag,
      documentQuality: body.documentQuality ?? submission.documentQuality,
      assignedReviewerId: body.assignedReviewerId ?? actorId,
      ...(decision === 'EXPIRE' ? { expiresAt: new Date() } : {}),
    })

    await kycRepository.syncUserKycStatus(submission.userId, nextStatus)
    await kycRepository.createReview({
      submission: { connect: { id: submission.id } },
      reviewer: { connect: { id: actorId } },
      decision,
      reason: body.reason ?? null,
      internalNotes: body.internalNotes ?? null,
      riskLevel: body.riskLevel ?? null,
      riskScore: body.riskScore ?? null,
      fraudFlag: body.fraudFlag ?? null,
      documentQuality: body.documentQuality ?? null,
    })
    await appendHistory(submission.id, historyAction, actorId, body.reason)
    await recordActivity(submission.userId, actorId, activityKind, notifyTitle, context)
    await notifyKyc(submission.userId, notifyTitle, notifyBody)
    await auditService.record({
      actorId,
      targetUserId: submission.userId,
      action: `kyc.${decision.toLowerCase()}`,
      module: 'kyc',
      oldValue: { status: submission.status },
      newValue: { status: nextStatus },
      reason: body.reason ?? null,
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return {
      ...toKycProfile({ ...updated, documents: submission.documents }),
      submission: await this.adminGet(submission.id),
    }
  },

  async metrics() {
    const start = new Date()
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 1)

    const [
      pendingKyc,
      approvedToday,
      rejectedToday,
      averageReviewTimeHours,
      reviewerRows,
      riskRows,
    ] = await Promise.all([
      kycRepository.countByStatus(['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO']),
      kycRepository.countReviewedBetween(start, end, 'APPROVED'),
      kycRepository.countReviewedBetween(start, end, 'REJECTED'),
      kycRepository.averageReviewHours(),
      kycRepository.reviewerPerformance(),
      kycRepository.riskDistribution(),
    ])

    const reviewerPerformance = Object.values(
      reviewerRows.reduce<
        Record<string, { reviewerId: string; approvals: number; rejections: number; total: number }>
      >((acc, row) => {
        const id = row.reviewerId ?? 'unknown'
        acc[id] ??= { reviewerId: id, approvals: 0, rejections: 0, total: 0 }
        acc[id]!.total += row._count._all
        if (row.decision === 'APPROVE') acc[id]!.approvals += row._count._all
        if (row.decision === 'REJECT') acc[id]!.rejections += row._count._all
        return acc
      }, {}),
    )

    const riskDistribution = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
      ...Object.fromEntries(riskRows.map((r) => [r.riskLevel, r._count._all])),
    }

    return {
      pendingKyc,
      approvedToday,
      rejectedToday,
      averageReviewTimeHours: Number(averageReviewTimeHours.toFixed(2)),
      reviewerPerformance,
      riskDistribution,
    }
  },

  async resolveSignedFile(key: string, expires: string, signature: string) {
    if (!storage.verifySignedDownloadUrl(key, expires, signature)) {
      throw forbidden('Invalid or expired download link.')
    }
    if (!key.startsWith('kyc/')) {
      throw forbidden('Invalid file key.')
    }
    return storage.getAbsolutePath(key)
  },
}
