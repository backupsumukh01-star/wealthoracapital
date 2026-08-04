import type { Prisma, UserProfile } from '@prisma/client'

import { prisma } from '../database/prisma.js'

export const profileRepository = {
  findByUserId(userId: string): Promise<UserProfile | null> {
    return prisma.userProfile.findUnique({ where: { userId } })
  },

  upsert(userId: string, data: Prisma.UserProfileUpdateInput): Promise<UserProfile> {
    return prisma.userProfile.upsert({
      where: { userId },
      create: {
        user: { connect: { id: userId } },
        addressLine1: typeof data.addressLine1 === 'string' ? data.addressLine1 : null,
        addressLine2: typeof data.addressLine2 === 'string' ? data.addressLine2 : null,
        city: typeof data.city === 'string' ? data.city : null,
        state: typeof data.state === 'string' ? data.state : null,
        postalCode: typeof data.postalCode === 'string' ? data.postalCode : null,
        language: typeof data.language === 'string' ? data.language : 'en',
        bio: typeof data.bio === 'string' ? data.bio : null,
      },
      update: data,
    })
  },

  ensure(userId: string): Promise<UserProfile> {
    return prisma.userProfile.upsert({
      where: { userId },
      create: { user: { connect: { id: userId } } },
      update: {},
    })
  },
}
