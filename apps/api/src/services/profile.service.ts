import { toPublicUser } from '../models/user.mapper.js'
import { profileRepository } from '../repositories/profile.repository.js'
import { sessionRepository } from '../repositories/session.repository.js'
import { userRepository } from '../repositories/user.repository.js'
import { badRequest, notFound, unauthorized } from '../utils/errors.js'
import { parseUserAgent } from '../utils/user-agent.js'
import { activityService } from './activity.service.js'
import { storage } from './storage/index.js'

export const profileService = {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw notFound('User not found.')
    }
    const profile = await profileRepository.ensure(userId)
    return {
      user: {
        ...toPublicUser(user),
        avatarUrl: user.avatarKey ? storage.getPublicUrl(user.avatarKey) : null,
        referralCode: user.referralCode,
        staffRole: user.staffRole,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      },
      profile: {
        addressLine1: profile.addressLine1,
        addressLine2: profile.addressLine2,
        city: profile.city,
        state: profile.state,
        postalCode: profile.postalCode,
        language: profile.language,
        bio: profile.bio,
      },
    }
  },

  async updateProfile(
    userId: string,
    patch: {
      firstName?: string
      lastName?: string
      phone?: string | null
      country?: string | null
      timezone?: string
      language?: string
      addressLine1?: string | null
      addressLine2?: string | null
      city?: string | null
      state?: string | null
      postalCode?: string | null
      bio?: string | null
    },
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const user = await userRepository.findById(userId)
    if (!user) {
      throw notFound('User not found.')
    }

    await userRepository.update(userId, {
      ...(patch.firstName !== undefined ? { firstName: patch.firstName } : {}),
      ...(patch.lastName !== undefined ? { lastName: patch.lastName } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.country !== undefined ? { country: patch.country } : {}),
      ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
    })

    await profileRepository.upsert(userId, {
      ...(patch.addressLine1 !== undefined ? { addressLine1: patch.addressLine1 } : {}),
      ...(patch.addressLine2 !== undefined ? { addressLine2: patch.addressLine2 } : {}),
      ...(patch.city !== undefined ? { city: patch.city } : {}),
      ...(patch.state !== undefined ? { state: patch.state } : {}),
      ...(patch.postalCode !== undefined ? { postalCode: patch.postalCode } : {}),
      ...(patch.language !== undefined ? { language: patch.language } : {}),
      ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
    })

    await activityService.record({
      userId,
      actorId: userId,
      kind: 'PROFILE_UPDATE',
      title: 'Profile updated',
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return this.getProfile(userId)
  },

  async uploadAvatar(
    userId: string,
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number },
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const allowedAvatarTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
    if (!allowedAvatarTypes.has(file.mimetype)) {
      throw badRequest('Avatar must be a JPEG, PNG, or WebP image.')
    }
    if (file.size > 2 * 1024 * 1024) {
      throw badRequest('Avatar must be 2MB or smaller.')
    }

    const user = await userRepository.findById(userId)
    if (!user) {
      throw notFound('User not found.')
    }

    if (user.avatarKey) {
      await storage.delete(user.avatarKey)
    }

    const stored = await storage.put({
      category: 'avatars',
      filename: file.originalname,
      buffer: file.buffer,
      contentType: file.mimetype,
    })

    await userRepository.update(userId, { avatarKey: stored.key })
    await activityService.record({
      userId,
      actorId: userId,
      kind: 'AVATAR_UPDATE',
      title: 'Avatar updated',
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return { avatarUrl: stored.url, key: stored.key }
  },

  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await sessionRepository.listActiveByUser(userId)
    return sessions.map((session) => {
      const parsed = parseUserAgent(session.userAgent)
      return {
        id: session.id,
        device: parsed.device,
        browser: parsed.browser,
        ip: session.ip ?? 'unknown',
        location: null,
        lastUsedAt: session.lastUsedAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        isCurrent: session.id === currentSessionId,
      }
    })
  },

  async currentSession(userId: string, currentSessionId: string) {
    const sessions = await this.listSessions(userId, currentSessionId)
    const current = sessions.find((session) => session.isCurrent)
    if (!current) {
      throw unauthorized('Current session not found.')
    }
    return current
  },

  async terminateSession(
    userId: string,
    sessionId: string,
    currentSessionId: string,
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const session = await sessionRepository.findById(sessionId)
    if (!session || session.userId !== userId) {
      throw badRequest('Session not found.')
    }
    if (session.id === currentSessionId) {
      throw badRequest('Use logout to end the current session.')
    }
    if (!session.revokedAt) {
      await sessionRepository.revoke(session.id)
      await activityService.record({
        userId,
        actorId: userId,
        kind: 'SESSION_TERMINATED',
        title: 'Session terminated',
        metadata: { sessionId },
        ip: context.ip,
        userAgent: context.userAgent,
      })
    }
  },

  async terminateOtherSessions(
    userId: string,
    currentSessionId: string,
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const count = await sessionRepository.revokeAllForUser(userId, currentSessionId)
    await activityService.record({
      userId,
      actorId: userId,
      kind: 'SESSION_TERMINATED',
      title: 'All other sessions terminated',
      metadata: { revoked: count },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return { revokedSessions: count }
  },
}
