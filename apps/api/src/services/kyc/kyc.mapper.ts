import type { KycDocument, KycHistory, KycSubmission } from '@prisma/client'

import { storage } from '../storage/index.js'

export function mapDocument(doc: KycDocument, extras?: {
  fileExists?: boolean
  absolutePath?: string | null
}) {
  return {
    id: doc.id,
    kind: doc.documentType,
    documentType: doc.documentType,
    side: doc.side,
    status: doc.status,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    originalName: doc.originalName,
    storageKey: doc.storageKey,
    // 1h so admins can review without links expiring mid-session
    downloadUrl: storage.createSignedDownloadUrl(doc.storageKey, 3600),
    // Public /uploads/kyc is intentionally blocked — use signed or admin stream URLs.
    publicUrl: storage.getPublicUrl(doc.storageKey),
    fileExists: extras?.fileExists,
    absolutePath: extras?.absolutePath ?? null,
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
    documents: documents.map((doc) => mapDocument(doc)),
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
      infoRequestMessage: null,
      documents: [] as Array<{ id: string; kind: string; status: string; side?: string; downloadUrl?: string }>,
    }
  }
  return {
    status: submission.status,
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    rejectionReason: submission.rejectionReason,
    infoRequestMessage: submission.infoRequestMessage,
    documents: (submission.documents ?? [])
      .filter((d) => !d.deletedAt)
      .map((d) => ({
        id: d.id,
        kind: d.documentType,
        side: d.side,
        status: d.status,
        mimeType: d.mimeType,
        originalName: d.originalName,
        downloadUrl: storage.createSignedDownloadUrl(d.storageKey, 3600),
      })),
  }
}
