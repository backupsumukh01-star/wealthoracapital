import type {
  KycDocument,
  KycHistory,
  KycReview,
  KycStatus,
  KycSubmission,
  Prisma,
} from '@prisma/client'

import { prisma } from '../database/prisma.js'

const ACTIVE_QUEUE: KycStatus[] = ['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO']

export const kycRepository = {
  findSubmissionById(id: string) {
    return prisma.kycSubmission.findUnique({
      where: { id },
      include: {
        documents: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        reviews: { orderBy: { createdAt: 'desc' } },
        history: { orderBy: { createdAt: 'desc' }, take: 50 },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            country: true,
            phone: true,
            kycStatus: true,
          },
        },
      },
    })
  },

  findLatestByUser(userId: string) {
    return prisma.kycSubmission.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        documents: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        reviews: { orderBy: { createdAt: 'desc' }, take: 5 },
        history: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    })
  },

  findEditableByUser(userId: string) {
    return prisma.kycSubmission.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'NEED_MORE_INFO', 'REJECTED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        documents: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      },
    })
  },

  findActiveLock(userId: string) {
    return prisma.kycSubmission.findFirst({
      where: {
        userId,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
      },
    })
  },

  createSubmission(data: Prisma.KycSubmissionCreateInput): Promise<KycSubmission> {
    return prisma.kycSubmission.create({ data })
  },

  updateSubmission(id: string, data: Prisma.KycSubmissionUpdateInput): Promise<KycSubmission> {
    return prisma.kycSubmission.update({ where: { id }, data })
  },

  createDocument(data: Prisma.KycDocumentCreateInput): Promise<KycDocument> {
    return prisma.kycDocument.create({ data })
  },

  findDocumentById(id: string) {
    return prisma.kycDocument.findFirst({
      where: { id, deletedAt: null },
      include: { submission: true },
    })
  },

  findDocumentByChecksum(checksumSha256: string, submissionId: string) {
    return prisma.kycDocument.findFirst({
      where: { checksumSha256, submissionId, deletedAt: null },
    })
  },

  softDeleteDocument(id: string): Promise<KycDocument> {
    return prisma.kycDocument.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'REPLACED' },
    })
  },

  createReview(data: Prisma.KycReviewCreateInput): Promise<KycReview> {
    return prisma.kycReview.create({ data })
  },

  createHistory(data: Prisma.KycHistoryCreateInput): Promise<KycHistory> {
    return prisma.kycHistory.create({ data })
  },

  listHistory(submissionId: string) {
    return prisma.kycHistory.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'desc' },
    })
  },

  async listAdmin(input: {
    where: Prisma.KycSubmissionWhereInput
    skip: number
    take: number
    cursor?: string
    sortOrder: 'asc' | 'desc'
  }) {
    const [items, total] = await prisma.$transaction([
      prisma.kycSubmission.findMany({
        where: input.where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              country: true,
              phone: true,
              kycStatus: true,
              createdAt: true,
            },
          },
          documents: { where: { deletedAt: null } },
        },
        orderBy: { createdAt: input.sortOrder },
        ...(input.cursor
          ? { cursor: { id: input.cursor }, skip: 1, take: input.take }
          : { skip: input.skip, take: input.take }),
      }),
      prisma.kycSubmission.count({ where: input.where }),
    ])
    return { items, total }
  },

  countByStatus(statuses: KycStatus[]) {
    return prisma.kycSubmission.count({ where: { status: { in: statuses } } })
  },

  countReviewedBetween(from: Date, to: Date, status: KycStatus) {
    return prisma.kycSubmission.count({
      where: {
        status,
        reviewedAt: { gte: from, lt: to },
      },
    })
  },

  async averageReviewHours() {
    const rows = await prisma.kycSubmission.findMany({
      where: {
        submittedAt: { not: null },
        reviewedAt: { not: null },
        status: { in: ['APPROVED', 'REJECTED'] },
      },
      select: { submittedAt: true, reviewedAt: true },
      take: 500,
      orderBy: { reviewedAt: 'desc' },
    })
    if (rows.length === 0) return 0
    const totalMs = rows.reduce((sum, row) => {
      if (!row.submittedAt || !row.reviewedAt) return sum
      return sum + (row.reviewedAt.getTime() - row.submittedAt.getTime())
    }, 0)
    return totalMs / rows.length / 3_600_000
  },

  async reviewerPerformance() {
    const rows = await prisma.kycReview.groupBy({
      by: ['reviewerId', 'decision'],
      _count: { _all: true },
      where: { reviewerId: { not: null } },
    })
    return rows
  },

  async riskDistribution() {
    return prisma.kycSubmission.groupBy({
      by: ['riskLevel'],
      _count: { _all: true },
      where: { status: { in: ACTIVE_QUEUE } },
    })
  },

  syncUserKycStatus(userId: string, status: KycStatus) {
    return prisma.user.update({
      where: { id: userId },
      data: { kycStatus: status },
    })
  },
}
