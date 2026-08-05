import jwt from 'jsonwebtoken'
import type { Role, StaffRole } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { env } from '../config/env.js'
import type { AccessTokenPayload } from '../types/auth.types.js'
import { generateSecureToken, sha256 } from '../utils/crypto.js'
import { unauthorized } from '../utils/errors.js'

function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration)
  if (!match) {
    throw new Error(`Unsupported duration format: ${duration}`)
  }
  const amount = Number(match[1])
  const unit = match[2]
  switch (unit) {
    case 's':
      return amount * 1000
    case 'm':
      return amount * 60_000
    case 'h':
      return amount * 3_600_000
    case 'd':
      return amount * 86_400_000
    default:
      throw new Error(`Unsupported duration unit: ${unit}`)
  }
}

export const tokenService = {
  accessTokenTtlMs(): number {
    return parseDurationToMs(env.JWT_ACCESS_EXPIRES_IN)
  },

  refreshTokenTtlMs(): number {
    return parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN)
  },

  signAccessToken(input: {
    userId: string
    role: Role
    staffRole: StaffRole | null
    sessionId: string
  }): string {
    const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
      sub: input.userId,
      role: input.role,
      staffRole: input.staffRole,
      sid: input.sessionId,
      jti: randomUUID(),
      iss: env.JWT_ISSUER,
      aud: env.JWT_AUDIENCE,
    }

    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      algorithm: 'HS256',
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    })
  },

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
        algorithms: ['HS256'],
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      })
      if (typeof decoded === 'string') {
        throw unauthorized('Invalid access token.')
      }
      return decoded as AccessTokenPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        const expired = new Error('Access token expired.')
        expired.name = 'TokenExpiredError'
        throw expired
      }
      throw unauthorized('Invalid access token.')
    }
  },

  createOpaqueRefreshToken(): { raw: string; hash: string } {
    const raw = generateSecureToken(32)
    return { raw, hash: sha256(raw) }
  },

  hashToken(raw: string): string {
    return sha256(raw)
  },

  createCsrfToken(): string {
    return generateSecureToken(24)
  },
}
