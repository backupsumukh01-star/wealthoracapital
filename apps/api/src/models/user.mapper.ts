import type { User as SharedUser } from '@meridian/shared'
import type { User } from '@prisma/client'

import { resolvePermissions } from '../config/permissions.js'
import { storage } from '../services/storage/index.js'

/** Map a Prisma user to the shared frontend DTO (wallet omitted until later phases). */
export function toPublicUser(user: User): SharedUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    country: user.country,
    timezone: user.timezone,
    avatarUrl: user.avatarKey ? storage.getPublicUrl(user.avatarKey) : null,
    role: user.role,
    staffRole: user.staffRole,
    permissions: resolvePermissions({ role: user.role, staffRole: user.staffRole }),
    status: user.status,
    kycStatus: user.kycStatus,
    emailVerified: user.emailVerifiedAt !== null,
    deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  }
}
