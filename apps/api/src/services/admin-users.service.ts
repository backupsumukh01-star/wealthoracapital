import type { Role, StaffRole, User, UserStatus } from '@prisma/client'

import { toPublicUser } from '../models/user.mapper.js'
import { sessionRepository } from '../repositories/session.repository.js'
import { userRepository, type UserListFilters } from '../repositories/user.repository.js'
import { badRequest, forbidden, notFound } from '../utils/errors.js'
import { storage } from './storage/index.js'
import { activityService } from './activity.service.js'
import { auditService } from './audit.service.js'
import { notificationService } from './notification.service.js'

function snapshotUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    country: user.country,
    timezone: user.timezone,
    role: user.role,
    staffRole: user.staffRole,
    status: user.status,
    kycStatus: user.kycStatus,
    emailVerified: user.emailVerifiedAt !== null,
    deletedAt: user.deletedAt?.toISOString() ?? null,
  }
}

/** Higher number = more privilege. Used to stop lateral/vertical escalation. */
function privilegeRank(user: { role: Role; staffRole: StaffRole | null }): number {
  if (user.role === 'SUPER_ADMIN' || user.staffRole === 'SUPER_ADMIN') return 100
  if (user.role === 'ADMIN' || user.staffRole === 'ADMIN') return 80
  if (user.staffRole === 'FINANCE') return 60
  if (user.staffRole === 'SUPPORT' || user.staffRole === 'KYC' || user.staffRole === 'CONTENT') {
    return 40
  }
  if (user.staffRole === 'VIEWER') return 20
  return 0
}

function assertCanManageTarget(
  actor: { role: Role; staffRole: StaffRole | null },
  target: { role: Role; staffRole: StaffRole | null },
): void {
  const actorRank = privilegeRank(actor)
  const targetRank = privilegeRank(target)
  if (targetRank === 0) return
  // Super Admins may manage other staff, including peer Super Admins (self blocked elsewhere).
  if (actorRank === 100) return
  if (actorRank <= targetRank) {
    throw forbidden('You cannot manage an account with equal or higher privilege.')
  }
}

export const adminUsersService = {
  async list(input: {
    filters: UserListFilters
    page: number
    limit: number
    cursor?: string
    sortBy: 'createdAt' | 'email' | 'status' | 'kycStatus' | 'firstName' | 'lastName'
    sortOrder: 'asc' | 'desc'
  }) {
    const skip = (input.page - 1) * input.limit
    const { items, total } = await userRepository.list({
      filters: input.filters,
      skip,
      take: input.limit,
      cursor: input.cursor,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
    })

    const mapped = items.map((user) => ({
      ...toPublicUser(user),
      staffRole: user.staffRole,
      referralCode: user.referralCode,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      deletedAt: user.deletedAt?.toISOString() ?? null,
      avatarUrl: user.avatarKey ? storage.getPublicUrl(user.avatarKey) : null,
    }))

    return {
      items: mapped,
      nextCursor: mapped.length === input.limit ? items[items.length - 1]?.id ?? null : null,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / input.limit)),
        hasNext: skip + mapped.length < total,
      },
    }
  },

  async getById(id: string) {
    const user = await userRepository.findByIdIncludingDeleted(id)
    if (!user) {
      throw notFound('User not found.')
    }
    return {
      ...toPublicUser(user),
      staffRole: user.staffRole,
      referralCode: user.referralCode,
      referredById: user.referredById,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      lastLoginIp: user.lastLoginIp,
      twoFactorEnabled: user.twoFactorEnabled,
      deletedAt: user.deletedAt?.toISOString() ?? null,
      avatarUrl: user.avatarKey ? storage.getPublicUrl(user.avatarKey) : null,
    }
  },

  async update(
    actorId: string,
    id: string,
    patch: {
      firstName?: string
      lastName?: string
      phone?: string | null
      country?: string | null
      timezone?: string
      role?: Role
      staffRole?: User['staffRole']
    },
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const existing = await userRepository.findByIdIncludingDeleted(id)
    if (!existing || existing.deletedAt) {
      throw notFound('User not found.')
    }

    const actor = await userRepository.findById(actorId)
    if (!actor) {
      throw forbidden('Actor not found.')
    }

    assertCanManageTarget(
      { role: actor.role, staffRole: actor.staffRole },
      { role: existing.role, staffRole: existing.staffRole },
    )

    const elevatingRole = patch.role !== undefined && patch.role !== existing.role
    const elevatingStaff = patch.staffRole !== undefined && patch.staffRole !== existing.staffRole
    if (elevatingRole || elevatingStaff) {
      const actorIsSuper =
        actor.role === 'SUPER_ADMIN' || actor.staffRole === 'SUPER_ADMIN'
      if (!actorIsSuper) {
        throw forbidden('Only Super Admin can change role or staffRole.')
      }
      if (patch.role === 'SUPER_ADMIN' || patch.staffRole === 'SUPER_ADMIN') {
        // Already gated to Super Admin above.
      }
    }

    const updated = await userRepository.update(id, {
      ...(patch.firstName !== undefined ? { firstName: patch.firstName } : {}),
      ...(patch.lastName !== undefined ? { lastName: patch.lastName } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.country !== undefined ? { country: patch.country } : {}),
      ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
      ...(patch.role !== undefined ? { role: patch.role } : {}),
      ...(patch.staffRole !== undefined ? { staffRole: patch.staffRole } : {}),
    })

    await auditService.record({
      actorId,
      targetUserId: id,
      action: 'user.update',
      module: 'users',
      oldValue: snapshotUser(existing),
      newValue: snapshotUser(updated),
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await activityService.record({
      userId: id,
      actorId,
      kind: 'ADMIN_ACTION',
      title: 'Profile updated by admin',
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return this.getById(id)
  },

  async setStatus(
    actorId: string,
    id: string,
    status: UserStatus,
    action: string,
    reason: string | null,
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const existing = await userRepository.findByIdIncludingDeleted(id)
    if (!existing || existing.deletedAt) {
      throw notFound('User not found.')
    }
    if (existing.id === actorId && (status === 'SUSPENDED' || status === 'BLOCKED' || status === 'CLOSED')) {
      throw badRequest('You cannot change your own account to this status.')
    }

    const actor = await userRepository.findById(actorId)
    if (!actor) {
      throw forbidden('Actor not found.')
    }
    assertCanManageTarget(
      { role: actor.role, staffRole: actor.staffRole },
      { role: existing.role, staffRole: existing.staffRole },
    )

    const updated = await userRepository.update(id, { status })
    await auditService.record({
      actorId,
      targetUserId: id,
      action,
      module: 'users',
      oldValue: { status: existing.status },
      newValue: { status },
      reason,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await activityService.record({
      userId: id,
      actorId,
      kind: 'ACCOUNT_STATUS_CHANGE',
      title: `Account status changed to ${status}`,
      description: reason,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await notificationService.notify({
      userId: id,
      kind: 'ACCOUNT',
      title: 'Account status updated',
      body: reason ?? `Your account status is now ${status}.`,
    })

    if (status === 'SUSPENDED' || status === 'BLOCKED' || status === 'CLOSED') {
      await sessionRepository.revokeAllForUser(id)
    }

    return this.getById(updated.id)
  },

  async softDelete(
    actorId: string,
    id: string,
    reason: string | null,
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const existing = await userRepository.findByIdIncludingDeleted(id)
    if (!existing) {
      throw notFound('User not found.')
    }
    if (existing.deletedAt) {
      throw badRequest('User is already deleted.')
    }
    if (existing.id === actorId) {
      throw badRequest('You cannot delete your own account.')
    }

    const actor = await userRepository.findById(actorId)
    if (!actor) {
      throw forbidden('Actor not found.')
    }
    assertCanManageTarget(
      { role: actor.role, staffRole: actor.staffRole },
      { role: existing.role, staffRole: existing.staffRole },
    )

    const updated = await userRepository.update(id, {
      deletedAt: new Date(),
      status: 'ARCHIVED',
    })
    await sessionRepository.revokeAllForUser(id)
    await auditService.record({
      actorId,
      targetUserId: id,
      action: 'user.delete',
      module: 'users',
      oldValue: snapshotUser(existing),
      newValue: snapshotUser(updated),
      reason,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await activityService.record({
      userId: id,
      actorId,
      kind: 'ADMIN_ACTION',
      title: 'Account soft-deleted',
      description: reason,
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return this.getById(id)
  },

  async restore(
    actorId: string,
    id: string,
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const existing = await userRepository.findByIdIncludingDeleted(id)
    if (!existing) {
      throw notFound('User not found.')
    }
    if (!existing.deletedAt) {
      throw badRequest('User is not deleted.')
    }

    const updated = await userRepository.update(id, {
      deletedAt: null,
      status: existing.emailVerifiedAt ? 'ACTIVE' : 'PENDING_VERIFICATION',
    })
    await auditService.record({
      actorId,
      targetUserId: id,
      action: 'user.restore',
      module: 'users',
      oldValue: snapshotUser(existing),
      newValue: snapshotUser(updated),
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await activityService.record({
      userId: id,
      actorId,
      kind: 'ADMIN_ACTION',
      title: 'Account restored',
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return this.getById(id)
  },

  async forceLogout(
    actorId: string,
    id: string,
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const existing = await userRepository.findById(id)
    if (!existing) {
      throw notFound('User not found.')
    }
    const count = await sessionRepository.revokeAllForUser(id)
    await auditService.record({
      actorId,
      targetUserId: id,
      action: 'user.force_logout',
      module: 'users',
      newValue: { revokedSessions: count },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await activityService.record({
      userId: id,
      actorId,
      kind: 'SESSION_TERMINATED',
      title: 'All sessions terminated by admin',
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return { ok: true, revokedSessions: count }
  },
}
