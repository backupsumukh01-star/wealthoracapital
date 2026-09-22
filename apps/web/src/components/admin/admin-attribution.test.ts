import { describe, expect, it } from 'vitest'

import {
  ADMIN_ATTRIBUTION_NO_SALESMAN,
  ADMIN_ATTRIBUTION_NOT_REFERRED,
  resolveAdminAttributionDisplay,
} from '@/components/admin/admin-attribution'

describe('resolveAdminAttributionDisplay', () => {
  it('shows referrer and salesman when present', () => {
    const display = resolveAdminAttributionDisplay({
      referral: {
        referredBy: {
          id: 'ref-1',
          name: 'User One',
          username: 'user1',
          referralCode: 'XYZ',
        },
      },
      salesman: { id: 'sm-1', name: 'Harsh', code: 'HARSH123' },
    })
    expect(display.referredByLabel).toBe('User One')
    expect(display.referralCodeLabel).toBe('XYZ')
    expect(display.salesmanNameLabel).toBe('Harsh')
    expect(display.salesmanCodeLabel).toBe('HARSH123')
    expect(display.referrerUserId).toBe('ref-1')
  })

  it('shows Not referred when referral is missing', () => {
    const display = resolveAdminAttributionDisplay({
      referral: null,
      salesman: { id: 'sm-1', name: 'Harsh', code: 'HARSH123' },
    })
    expect(display.referredByLabel).toBe(ADMIN_ATTRIBUTION_NOT_REFERRED)
    expect(display.referralCodeLabel).toBe('—')
    expect(display.salesmanNameLabel).toBe('Harsh')
  })

  it('shows No salesman when salesman is missing', () => {
    const display = resolveAdminAttributionDisplay({
      referral: {
        referredBy: {
          id: 'ref-2',
          name: 'Parent',
          username: 'parent',
          referralCode: 'ABC',
        },
      },
      salesman: null,
    })
    expect(display.referredByLabel).toBe('Parent')
    expect(display.salesmanNameLabel).toBe(ADMIN_ATTRIBUTION_NO_SALESMAN)
    expect(display.salesmanCodeLabel).toBe('—')
  })

  it('handles neither referral nor salesman', () => {
    const display = resolveAdminAttributionDisplay({ referral: null, salesman: null })
    expect(display.referredByLabel).toBe(ADMIN_ATTRIBUTION_NOT_REFERRED)
    expect(display.salesmanNameLabel).toBe(ADMIN_ATTRIBUTION_NO_SALESMAN)
  })

  it('accepts deposit/withdrawal-shaped payloads', () => {
    const depositShape = {
      referral: {
        referredBy: {
          id: 'u-ref',
          name: 'Referrer',
          username: 'ref',
          referralCode: 'CODE99',
        },
      },
      salesman: null,
    }
    const fromDeposit = resolveAdminAttributionDisplay(depositShape)
    expect(fromDeposit.referralCodeLabel).toBe('CODE99')
    expect(fromDeposit.salesmanNameLabel).toBe(ADMIN_ATTRIBUTION_NO_SALESMAN)
  })
})
