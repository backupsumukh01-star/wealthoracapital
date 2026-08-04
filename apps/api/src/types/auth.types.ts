import type { Role, StaffRole } from '@prisma/client'

export interface AccessTokenPayload {
  sub: string
  role: Role
  staffRole: StaffRole | null
  sid: string
  jti: string
  iat: number
  exp: number
  iss: string
  aud: string
}

export interface SessionContext {
  ip: string | null
  userAgent: string | null
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  csrfToken: string
  accessTokenMaxAgeMs: number
  refreshTokenMaxAgeMs: number
}
