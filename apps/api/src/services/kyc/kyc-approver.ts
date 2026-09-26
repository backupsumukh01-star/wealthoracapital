/**
 * Resolve the human (or recorded) approver for a cleared KYC submission.
 * Prefer the latest KycReview with decision APPROVE; fall back to assignedReviewerId user.
 * Never invent a reviewer — callers should display "Not recorded" when null.
 */
export type KycApproverUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

export type ResolvedKycApprover = {
  reviewedBy: {
    id: string
    email: string
    name: string
  } | null
  approvedByLabel: string | null
}

export function resolveKycApprover(input: {
  approveReviewer?: KycApproverUser | null
  assignedReviewer?: KycApproverUser | null
}): ResolvedKycApprover {
  const reviewerUser = input.approveReviewer ?? input.assignedReviewer ?? null
  if (!reviewerUser) {
    return { reviewedBy: null, approvedByLabel: null }
  }
  const name =
    [reviewerUser.firstName, reviewerUser.lastName].filter(Boolean).join(' ').trim() ||
    reviewerUser.email
  return {
    reviewedBy: {
      id: reviewerUser.id,
      email: reviewerUser.email,
      name,
    },
    approvedByLabel: reviewerUser.email,
  }
}
