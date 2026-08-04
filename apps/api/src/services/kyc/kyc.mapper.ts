import type { KycDocument, KycHistory, KycSubmission } from '@prisma/client'

import { storage } from '../storage/index.js'

export function mapDocument(doc: KycDocument) {
  return {
    id: doc.id,
    kind: doc.documentType,
    documentType: doc.documentType,
    side: doc.side,
    status: doc.status,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    originalName: doc.originalName,
    downloadUrl: storage.createSignedDownloadUrl(doc.storageKey),
    createdAt: doc.createdAt.toISOString(),
  }
}

export function mapSubmission(
  submission: KycSubmission & {
    documents?: KycDocument[]
    history?: KycHistory[]
    user?: {
      id: string
      email: string
      firstName: string
      lastName: string
      country: string | null
      phone: string | null
      kycStatus: string
    }
  },
) {
  const documents = (submission.documents ?? []).filter((d) => !d.deletedAt)
  return {
    id: submission.id,
    referenceId: submission.referenceId,
    status: submission.status,
    country: submission.country,
    dateOfBirth: submission.dateOfBirth.toISOString().slice(0, 10),
    nationality: submission.nationality,
    addressLine1: submission.addressLine1,
    city: submission.city,
    postalCode: submission.postalCode,
    occupation: submission.occupation,
    primaryDocumentType: submission.primaryDocumentType,
    riskLevel: submission.riskLevel,
    riskScore: submission.riskScore,
    fraudFlag: submission.fraudFlag,
    documentQuality: submission.documentQuality,
    assignedReviewerId: submission.assignedReviewerId,
    rejectionReason: submission.rejectionReason,
    infoRequestMessage: submission.infoRequestMessage,
    internalNotes: submission.internalNotes,
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    expiresAt: submission.expiresAt?.toISOString() ?? null,
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
    documents: documents.map(mapDocument),
    history: (submission.history ?? []).map((item) => ({
      id: item.id,
      action: item.action,
      message: item.message,
      actorId: item.actorId,
      createdAt: item.createdAt.toISOString(),
    })),
    user: submission.user
      ? {
          id: submission.user.id,
          email: submission.user.email,
          firstName: submission.user.firstName,
          lastName: submission.user.lastName,
          country: submission.user.country,
          phone: submission.user.phone,
          kycStatus: submission.user.kycStatus,
        }
      : undefined,
  }
}

/** Shape expected by apps/web kycService.KycProfile */
export function toKycProfile(
  submission: KycSubmission & { documents?: KycDocument[] } | null,
  fallbackStatus: string = 'NOT_STARTED',
) {
  if (!submission) {
    return {
      status: fallbackStatus,
      submittedAt: null,
      reviewedAt: null,
      rejectionReason: null,
      documents: [] as Array<{ id: string; kind: string; status: string }>,
    }
  }
  return {
    status: submission.status,
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    rejectionReason: submission.rejectionReason,
    documents: (submission.documents ?? [])
      .filter((d) => !d.deletedAt)
      .map((d) => ({
        id: d.id,
        kind: d.documentType,
        status: d.status,
      })),
  }
}
