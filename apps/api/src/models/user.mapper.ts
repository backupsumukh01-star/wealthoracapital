import type { User as SharedUser } from '@meridian/shared'
import type { User } from '@prisma/client'

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
    avatarUrl: user.avatarKey,
    role: user.role,
    status: user.status,
    kycStatus: user.kycStatus,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt.toISOString(),
  }
}
