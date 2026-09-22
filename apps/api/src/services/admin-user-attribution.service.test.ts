import { describe, expect, it } from 'vitest'

import {
  adminUserAttributionService,
  resolveInheritedSalesman,
} from './admin-user-attribution.service.js'

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

describe('resolveInheritedSalesman', () => {
  const sm1 = { id: 'sm-1', name: 'Salesman 1', code: 'S1' }
  const sm2 = { id: 'sm-2', name: 'Salesman 2', code: 'S2' }

  it('CASE 1: returns direct salesman on the user', () => {
    const nodes = new Map([
      ['u1', { referredById: null, salesman: sm1 }],
    ])
    expect(resolveInheritedSalesman('u1', nodes)).toEqual(sm1)
  })

  it('CASE 2: inherits salesman from direct referrer', () => {
    const nodes = new Map([
      ['u1', { referredById: null, salesman: sm1 }],
      ['u2', { referredById: 'u1', salesman: null }],
    ])
    expect(resolveInheritedSalesman('u2', nodes)).toEqual(sm1)
  })

  it('CASE 3: inherits through U1 → U2 → U3', () => {
    const nodes = new Map([
      ['u1', { referredById: null, salesman: sm1 }],
      ['u2', { referredById: 'u1', salesman: null }],
      ['u3', { referredById: 'u2', salesman: null }],
    ])
    expect(resolveInheritedSalesman('u2', nodes)).toEqual(sm1)
    expect(resolveInheritedSalesman('u3', nodes)).toEqual(sm1)
  })

  it('CASE 4: inherits through a deep chain U1…U5', () => {
    const nodes = new Map([
      ['u1', { referredById: null, salesman: sm1 }],
      ['u2', { referredById: 'u1', salesman: null }],
      ['u3', { referredById: 'u2', salesman: null }],
      ['u4', { referredById: 'u3', salesman: null }],
      ['u5', { referredById: 'u4', salesman: null }],
    ])
    expect(resolveInheritedSalesman('u5', nodes)).toEqual(sm1)
  })

  it('CASE 5: direct attribution on U2 wins for U2 and descendants', () => {
    const nodes = new Map([
      ['u1', { referredById: null, salesman: sm1 }],
      ['u2', { referredById: 'u1', salesman: sm2 }],
      ['u3', { referredById: 'u2', salesman: null }],
    ])
    expect(resolveInheritedSalesman('u1', nodes)).toEqual(sm1)
    expect(resolveInheritedSalesman('u2', nodes)).toEqual(sm2)
    expect(resolveInheritedSalesman('u3', nodes)).toEqual(sm2)
  })

  it('CASE 6: returns null when chain has no salesman', () => {
    const nodes = new Map([
      ['u1', { referredById: null, salesman: null }],
      ['u2', { referredById: 'u1', salesman: null }],
      ['u3', { referredById: 'u2', salesman: null }],
    ])
    expect(resolveInheritedSalesman('u3', nodes)).toBeNull()
  })

  it('CASE 7: terminates safely on a referral cycle', () => {
    const nodes = new Map([
      ['u1', { referredById: 'u3', salesman: null }],
      ['u2', { referredById: 'u1', salesman: null }],
      ['u3', { referredById: 'u2', salesman: null }],
    ])
    expect(resolveInheritedSalesman('u1', nodes)).toBeNull()
    expect(resolveInheritedSalesman('u2', nodes)).toBeNull()
  })
})
