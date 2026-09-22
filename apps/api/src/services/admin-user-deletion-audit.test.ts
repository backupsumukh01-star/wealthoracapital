import { describe, expect, it } from 'vitest'

import {
  buildPermanentDeleteSnapshot,
  isCompletedPermanentDeleteAudit,
  parsePermanentDeleteSnapshot,
  permanentDeleteAuditNewValue,
  permanentDeleteAuditReason,
  snapshotContainsForbiddenKeys,
} from './admin-user-deletion-audit.js'

describe('admin-user-deletion-audit', () => {
  it('builds an identity-only snapshot with deleted-by actor', () => {
    const snapshot = buildPermanentDeleteSnapshot({
      user: {
        id: 'u-1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        referralCode: 'ABC12345',
      },
      actor: {
        id: 'a-1',
        email: 'admin@example.com',
        firstName: 'Super',
        lastName: 'Admin',
      },
      deletionRef: 'del_u-1_abcd1234',
    })

    expect(snapshot).toEqual({
      deletedUserId: 'u-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'John Doe',
      username: 'john',
      referralCode: 'ABC12345',
      deletionRef: 'del_u-1_abcd1234',
      deletedByAdminId: 'a-1',
      deletedByName: 'Super Admin',
      deletedByEmail: 'admin@example.com',
    })
    expect(snapshotContainsForbiddenKeys(snapshot as unknown as Record<string, unknown>)).toEqual(
      [],
    )
    expect(permanentDeleteAuditReason(snapshot)).toContain('john@example.com')
    expect(permanentDeleteAuditReason(snapshot)).toContain('del_u-1_abcd1234')
  })

  it('marks only COMPLETED permanent-delete audits as listable', () => {
    expect(
      isCompletedPermanentDeleteAudit({
        action: 'user.permanent_delete',
        module: 'users',
        newValue: permanentDeleteAuditNewValue('del_x'),
      }),
    ).toBe(true)

    expect(
      isCompletedPermanentDeleteAudit({
        action: 'user.permanent_delete',
        module: 'users',
        newValue: { deleted: true, deletionRef: 'del_x' },
      }),
    ).toBe(false)

    expect(
      isCompletedPermanentDeleteAudit({
        action: 'user.soft_delete',
        module: 'users',
        newValue: permanentDeleteAuditNewValue('del_x'),
      }),
    ).toBe(false)
  })

  it('parses snapshots and rejects incomplete payloads', () => {
    const parsed = parsePermanentDeleteSnapshot({
      deletedUserId: 'u-2',
      email: 'a@b.co',
      firstName: 'A',
      lastName: 'B',
      displayName: 'A B',
      username: 'a',
      referralCode: null,
      deletionRef: 'del_u-2_zzzz',
      deletedByAdminId: 'admin',
      deletedByName: 'Harsh',
      deletedByEmail: 'harsh@ex.com',
    })
    expect(parsed?.deletedByName).toBe('Harsh')
    expect(parsePermanentDeleteSnapshot({ deletionRef: 'x' })).toBeNull()
  })
})
