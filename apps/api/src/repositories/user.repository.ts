import type { Prisma, User, UserStatus } from '@prisma/client'

import { prisma } from '../database/prisma.js'

export type UserListFilters = {
  q?: string
  status?: UserStatus
  role?: User['role']
  country?: string
  emailVerified?: boolean
  kycStatus?: User['kycStatus']
  from?: Date
  to?: Date
  includeDeleted?: boolean
  phone?: string
  referralCode?: string
}

function buildWhere(filters: UserListFilters): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = []

  if (!filters.includeDeleted) {
    and.push({ deletedAt: null })
  }

  if (filters.status) and.push({ status: filters.status })
  if (filters.role) and.push({ role: filters.role })
  if (filters.country) and.push({ country: filters.country.toUpperCase() })
  if (filters.kycStatus) and.push({ kycStatus: filters.kycStatus })
  if (filters.phone) and.push({ phone: { contains: filters.phone } })
  if (filters.referralCode) and.push({ referralCode: filters.referralCode.toUpperCase() })
  if (filters.emailVerified === true) and.push({ emailVerifiedAt: { not: null } })
  if (filters.emailVerified === false) and.push({ emailVerifiedAt: null })
  if (filters.from || filters.to) {
    and.push({
      createdAt: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      },
    })
  }

  if (filters.q && filters.q.trim().length >= 2) {
    const q = filters.q.trim()
    const or: Prisma.UserWhereInput[] = [
      { email: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { referralCode: { contains: q.toUpperCase() } },
    ]
    if (q.length === 2) {
      or.push({ country: q.toUpperCase() })
    }
    and.push({ OR: or })
  }

  return and.length > 0 ? { AND: and } : {}
}

export const userRepository = {
  findById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    })
  },

  findByIdIncludingDeleted(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  },

  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
    })
  },

  findByPhone(phone: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { phone, deletedAt: null },
    })
  },

  findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { googleId, deletedAt: null },
    })
  },

  findByReferralCode(referralCode: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { referralCode, deletedAt: null },
    })
  },

  create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data })
  },

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    })
  },

  async markEmailVerified(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        emailVerifiedAt: new Date(),
        status: 'ACTIVE' satisfies UserStatus,
      },
    })
  },

  async updatePassword(id: string, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    })
  },

  async recordFailedLogin(id: string, failedLoginCount: number, lockedUntil: Date | null): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { failedLoginCount, lockedUntil },
    })
  },

  async recordSuccessfulLogin(id: string, ip: string | null): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    })
  },

  async list(input: {
    filters: UserListFilters
    skip: number
    take: number
    cursor?: string
    sortBy: 'createdAt' | 'email' | 'status' | 'kycStatus' | 'firstName' | 'lastName'
    sortOrder: 'asc' | 'desc'
  }): Promise<{ items: User[]; total: number }> {
    const where = buildWhere(input.filters)
    const orderBy = { [input.sortBy]: input.sortOrder } as Prisma.UserOrderByWithRelationInput

    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy,
        ...(input.cursor
          ? { cursor: { id: input.cursor }, skip: 1, take: input.take }
          : { skip: input.skip, take: input.take }),
      }),
      prisma.user.count({ where }),
    ])

    return { items, total }
  },

  async count(filters: UserListFilters = {}): Promise<number> {
    return prisma.user.count({ where: buildWhere(filters) })
  },

  async countCreatedBetween(from: Date, to: Date): Promise<number> {
    return prisma.user.count({
      where: {
        deletedAt: null,
        createdAt: { gte: from, lt: to },
      },
    })
  },

  async countByStatus(status: UserStatus): Promise<number> {
    return prisma.user.count({ where: { deletedAt: null, status } })
  },

  async countPendingKyc(): Promise<number> {
    return prisma.user.count({
      where: {
        deletedAt: null,
        kycStatus: { in: ['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO'] },
      },
    })
  },
}
