import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'

import { env } from '../config/env.js'
import { tokenService } from './token.service.js'
import { unauthorized } from '../utils/errors.js'

export type SalesAccessTokenPayload = {
  sub: string
  sid: string
  typ: 'salesman'
  jti: string
  iat: number
  exp: number
  iss: string
  aud: string
}

export const salesTokenService = {
  accessTokenTtlMs(): number {
    return tokenService.accessTokenTtlMs()
  },

  refreshTokenTtlMs(): number {
    return tokenService.refreshTokenTtlMs()
  },

  signAccessToken(input: { salesmanId: string; sessionId: string; expiresIn?: string }): string {
    const payload: Omit<SalesAccessTokenPayload, 'iat' | 'exp'> = {
      sub: input.salesmanId,
      sid: input.sessionId,
      typ: 'salesman',
      jti: randomUUID(),
      iss: env.JWT_SALES_ISSUER,
      aud: env.JWT_SALES_AUDIENCE,
    }

    return jwt.sign(payload, env.JWT_SALES_SECRET, {
      algorithm: 'HS256',
      expiresIn: (input.expiresIn ?? env.JWT_ACCESS_EXPIRES_IN) as jwt.SignOptions['expiresIn'],
    })
  },

  verifyAccessToken(token: string): SalesAccessTokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SALES_SECRET, {
        algorithms: ['HS256'],
        issuer: env.JWT_SALES_ISSUER,
        audience: env.JWT_SALES_AUDIENCE,
      })
      if (typeof decoded === 'string' || decoded.typ !== 'salesman') {
        throw unauthorized('Invalid access token.')
      }
      return decoded as SalesAccessTokenPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        const expired = new Error('Access token expired.')
        expired.name = 'TokenExpiredError'
        throw expired
      }
      throw unauthorized('Invalid access token.')
    }
  },
}
