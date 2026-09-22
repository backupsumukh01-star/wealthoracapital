import { describe, expect, it } from 'vitest'

import {
  accountAccessMessage,
  canTransact,
  investorHomeAfterAuth,
  isKycPendingReview,
  requiresKycOnboarding,
} from './account-access'

describe('account-access KYC gating', () => {
  it('allows transactions only when approved', () => {
    expect(canTransact('APPROVED')).toBe(true)
    expect(canTransact('UNDER_REVIEW')).toBe(false)
    expect(canTransact('SUBMITTED')).toBe(false)
    expect(canTransact('NOT_STARTED')).toBe(false)
    expect(canTransact('REJECTED')).toBe(false)
  })

  it('treats under-review as pending app access, not onboarding lockout', () => {
    expect(isKycPendingReview('UNDER_REVIEW')).toBe(true)
    expect(isKycPendingReview('SUBMITTED')).toBe(true)
    expect(requiresKycOnboarding('UNDER_REVIEW')).toBe(false)
    expect(requiresKycOnboarding('SUBMITTED')).toBe(false)
    expect(requiresKycOnboarding('NOT_STARTED')).toBe(true)
    expect(requiresKycOnboarding('REJECTED')).toBe(true)
    expect(requiresKycOnboarding('NEED_MORE_INFO')).toBe(true)
    expect(requiresKycOnboarding('APPROVED')).toBe(false)
  })

  it('sends pending review users to dashboard after auth', () => {
    expect(investorHomeAfterAuth('UNDER_REVIEW')).toContain('dashboard')
    expect(investorHomeAfterAuth('SUBMITTED')).toContain('dashboard')
    expect(investorHomeAfterAuth('APPROVED')).toContain('dashboard')
    expect(investorHomeAfterAuth('NOT_STARTED')).toContain('onboarding')
    expect(investorHomeAfterAuth('REJECTED')).toContain('onboarding')
  })

  it('uses review copy without forcing an onboarding CTA while pending', () => {
    const pending = accountAccessMessage('UNDER_REVIEW')
    expect(pending.label).toMatch(/under review/i)
    expect(pending.description).toMatch(/24–48 hours/)
    expect(pending.nextActionHref).toBeUndefined()
  })
})
