import { describe, expect, it } from 'vitest'

import {
  hasPermission,
  isStaffUser,
  listRoleCatalog,
  PERMISSIONS,
  resolvePermissions,
} from './permissions.js'

describe('RBAC permissions', () => {
  it('SUPER_ADMIN receives all permissions', () => {
    const perms = resolvePermissions({ role: 'SUPER_ADMIN', staffRole: null })
    expect(perms).toEqual(expect.arrayContaining(Object.values(PERMISSIONS)))
    expect(perms.length).toBe(Object.values(PERMISSIONS).length)
  })

  it('investor cannot manage finance, cms, settings, or admin referrals', () => {
    const perms = resolvePermissions({ role: 'USER', staffRole: null })
    expect(hasPermission({ role: 'USER', staffRole: null }, 'wallet.view')).toBe(true)
    expect(hasPermission({ role: 'USER', staffRole: null }, 'finance.adjust')).toBe(false)
    expect(hasPermission({ role: 'USER', staffRole: null }, 'finance.view')).toBe(false)
    expect(hasPermission({ role: 'USER', staffRole: null }, 'cms.manage')).toBe(false)
    expect(hasPermission({ role: 'USER', staffRole: null }, 'settings.manage')).toBe(false)
    expect(perms).toContain('kyc.submit')
    expect(perms).toContain('deposits.create')
  })

  it('FINANCE staff can view referrals but cannot manage settings', () => {
    expect(hasPermission({ role: 'ADMIN', staffRole: 'FINANCE' }, 'finance.view')).toBe(true)
    expect(hasPermission({ role: 'ADMIN', staffRole: 'FINANCE' }, 'settings.manage')).toBe(false)
  })

  it('FINANCE staff has finance permissions but not cms.manage', () => {
    // Staff maps apply only to ADMIN accounts; staffRole on USER must not elevate.
    expect(hasPermission({ role: 'ADMIN', staffRole: 'FINANCE' }, 'finance.review')).toBe(true)
    expect(hasPermission({ role: 'ADMIN', staffRole: 'FINANCE' }, 'cms.manage')).toBe(false)
    expect(hasPermission({ role: 'USER', staffRole: 'FINANCE' }, 'finance.review')).toBe(false)
    expect(isStaffUser({ role: 'ADMIN', staffRole: 'FINANCE' })).toBe(true)
    expect(isStaffUser({ role: 'USER', staffRole: 'FINANCE' })).toBe(false)
  })

  it('SUPPORT cannot approve KYC', () => {
    expect(hasPermission({ role: 'ADMIN', staffRole: 'SUPPORT' }, 'support.manage')).toBe(true)
    expect(hasPermission({ role: 'ADMIN', staffRole: 'SUPPORT' }, 'kyc.review')).toBe(false)
  })

  it('CONTENT can manage CMS and media', () => {
    expect(hasPermission({ role: 'ADMIN', staffRole: 'CONTENT' }, 'cms.manage')).toBe(true)
    expect(hasPermission({ role: 'ADMIN', staffRole: 'CONTENT' }, 'media.manage')).toBe(true)
    expect(hasPermission({ role: 'ADMIN', staffRole: 'CONTENT' }, 'finance.adjust')).toBe(false)
  })

  it('VIEWER is read-only on finance', () => {
    expect(hasPermission({ role: 'ADMIN', staffRole: 'VIEWER' }, 'finance.view')).toBe(true)
    expect(hasPermission({ role: 'ADMIN', staffRole: 'VIEWER' }, 'finance.review')).toBe(false)
    expect(hasPermission({ role: 'ADMIN', staffRole: 'VIEWER' }, 'users.edit')).toBe(false)
  })

  it('isStaffUser detects ADMIN and staff roles', () => {
    expect(isStaffUser({ role: 'ADMIN', staffRole: null })).toBe(true)
    expect(isStaffUser({ role: 'USER', staffRole: null })).toBe(false)
  })

  it('listRoleCatalog exposes investor and staff roles', () => {
    const catalog = listRoleCatalog()
    expect(catalog.map((r) => r.roleKey)).toEqual(
      expect.arrayContaining(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'INVESTOR']),
    )
  })

  it('prevents privilege escalation: investor lacks users.delete', () => {
    expect(hasPermission({ role: 'USER', staffRole: null }, 'users.delete')).toBe(false)
    expect(hasPermission({ role: 'USER', staffRole: null }, 'users.suspend')).toBe(false)
  })
})
