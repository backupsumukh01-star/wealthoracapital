import { describe, expect, it } from 'vitest'

import { resolveKycApprover } from './kyc-approver.js'

describe('resolveKycApprover', () => {
  it('prefers the APPROVE review reviewer over assignedReviewerId fallback', () => {
    const result = resolveKycApprover({
      approveReviewer: {
        id: 'r1',
        email: 'approver@example.com',
        firstName: 'Ann',
        lastName: 'Admin',
      },
      assignedReviewer: {
        id: 'r2',
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'Admin',
      },
    })
    expect(result.approvedByLabel).toBe('approver@example.com')
    expect(result.reviewedBy).toEqual({
      id: 'r1',
      email: 'approver@example.com',
      name: 'Ann Admin',
    })
  })

  it('falls back to assigned reviewer when no APPROVE review reviewer exists', () => {
    const result = resolveKycApprover({
      approveReviewer: null,
      assignedReviewer: {
        id: 'r2',
        email: 'fallback@example.com',
        firstName: 'Fall',
        lastName: 'Back',
      },
    })
    expect(result.approvedByLabel).toBe('fallback@example.com')
    expect(result.reviewedBy?.name).toBe('Fall Back')
  })

  it('returns null when no reviewer was recorded', () => {
    expect(resolveKycApprover({})).toEqual({ reviewedBy: null, approvedByLabel: null })
    expect(resolveKycApprover({ approveReviewer: null, assignedReviewer: null })).toEqual({
      reviewedBy: null,
      approvedByLabel: null,
    })
  })
})
