import type { Role, User, UserStatus } from '@prisma/client'

import { toPublicUser } from '../models/user.mapper.js'
import { sessionRepository } from '../repositories/session.repository.js'
import { userRepository, type UserListFilters } from '../repositories/user.repository.js'
import { badRequest, notFound } from '../utils/errors.js'
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
