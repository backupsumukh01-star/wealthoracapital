import { describe, expect, it } from 'vitest'

import { adminUserAttributionService } from './admin-user-attribution.service.js'

describe('adminUserAttributionService.mapAttributionRow', () => {
  it('maps referrer and salesman when present', () => {
    const result = adminUserAttributionService.mapAttributionRow({
      id: 'user-1',
      referredBy: {
        id: 'ref-1',
        firstName: 'Pat',
        lastName: 'Referrer',
        email: 'pat.referrer@example.com',
        referralCode: 'PATCODE1',
      },
      salesAttribution: {
        salesman: { id: 'sm-1', name: 'Sales Rep', code: 'SREP01' },
      },
    })
    expect(result.referral?.referredBy).toEqual({
      id: 'ref-1',
      name: 'Pat Referrer',
      username: 'pat.referrer',
      referralCode: 'PATCODE1',
    })
    expect(result.salesman).toEqual({ id: 'sm-1', name: 'Sales Rep', code: 'SREP01' })
  })

  it('returns null referral and salesman when absent', () => {
    const result = adminUserAttributionService.mapAttributionRow({
      id: 'user-2',
      referredBy: null,
      salesAttribution: null,
    })
    expect(result.referral).toBeNull()
    expect(result.salesman).toBeNull()
  })

  it('returns referral only when salesman is missing', () => {
    const result = adminUserAttributionService.mapAttributionRow({
      id: 'user-3',
      referredBy: {
        id: 'ref-2',
        firstName: 'Only',
        lastName: 'Ref',
        email: 'only@example.com',
        referralCode: null,
      },
      salesAttribution: null,
    })
    expect(result.referral?.referredBy.username).toBe('only')
    expect(result.salesman).toBeNull()
  })

  it('returns salesman only when referrer is missing', () => {
    const result = adminUserAttributionService.mapAttributionRow({
      id: 'user-4',
      referredBy: null,
      salesAttribution: {
        salesman: { id: 'sm-2', name: 'Solo Sales', code: 'SOLO' },
      },
    })
    expect(result.referral).toBeNull()
    expect(result.salesman?.code).toBe('SOLO')
  })
})
