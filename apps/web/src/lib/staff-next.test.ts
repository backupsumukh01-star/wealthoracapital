import { describe, expect, it } from 'vitest'
import { ROUTES } from '@meridian/shared'

import { isSalesOwnerNext, isStaffOauthNext, safeStaffNext } from './staff-next'

describe('safeStaffNext', () => {
  it('sends Sales Owner login back to the owner portal', () => {
    expect(safeStaffNext('/sales/owner')).toBe(ROUTES.sales.owner.root)
    expect(safeStaffNext('/sales/owner/salesmen')).toBe('/sales/owner/salesmen')
    expect(isSalesOwnerNext('/sales/owner')).toBe(true)
  })

  it('keeps admin destinations and rejects open redirects', () => {
    expect(safeStaffNext(null)).toBe(ROUTES.admin.root)
    expect(safeStaffNext('admin')).toBe(ROUTES.admin.root)
    expect(safeStaffNext('/admin/users')).toBe('/admin/users')
    expect(safeStaffNext('https://evil.example')).toBe(ROUTES.admin.root)
    expect(safeStaffNext('//evil.example')).toBe(ROUTES.admin.root)
    expect(safeStaffNext('/sales/dashboard')).toBe(ROUTES.admin.root)
    expect(isSalesOwnerNext('/admin')).toBe(false)
    expect(isStaffOauthNext(null)).toBe(false)
    expect(isStaffOauthNext('admin')).toBe(true)
    expect(isStaffOauthNext('/sales/owner')).toBe(true)
    expect(isStaffOauthNext('/login')).toBe(false)
  })
})
