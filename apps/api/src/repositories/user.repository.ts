import type { Prisma, User, UserStatus } from '@prisma/client'

import { prisma } from '../database/prisma.js'

export const userRepository = {
  findById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    })
  },

  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
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
}
