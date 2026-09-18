import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'

import { env } from '../config/env.js'
import { salesTokenService } from './sales-token.service.js'
import { tokenService } from './token.service.js'

describe('sales JWT isolation', () => {
  it('signs and verifies a salesman token with the sales secret', () => {
    const salesmanId = randomUUID()
    const sessionId = randomUUID()
    const token = salesTokenService.signAccessToken({ salesmanId, sessionId })
    const payload = salesTokenService.verifyAccessToken(token)
    expect(payload.sub).toBe(salesmanId)
    expect(payload.sid).toBe(sessionId)
    expect(payload.typ).toBe('salesman')
    expect(payload.iss).toBe(env.JWT_SALES_ISSUER)
    expect(payload.aud).toBe(env.JWT_SALES_AUDIENCE)
  })

  it('rejects a tampered sales JWT', () => {
    const token = salesTokenService.signAccessToken({
      salesmanId: randomUUID(),
      sessionId: randomUUID(),
    })
    expect(() => salesTokenService.verifyAccessToken(`${token.slice(0, -4)}xxxx`)).toThrow()
  })

  it('rejects an expired sales JWT', () => {
    const token = salesTokenService.signAccessToken({
      salesmanId: randomUUID(),
      sessionId: randomUUID(),
      expiresIn: '1ms',
    })
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        try {
          expect(() => salesTokenService.verifyAccessToken(token)).toThrow()
          try {
            salesTokenService.verifyAccessToken(token)
          } catch (error) {
            expect(error).toBeInstanceOf(Error)
            expect((error as Error).name).toBe('TokenExpiredError')
          }
          resolve()
        } catch (error) {
          reject(error)
        }
      }, 20)
    })
  })

  it('cannot verify a sales JWT with the investor token service', () => {
    const token = salesTokenService.signAccessToken({
      salesmanId: randomUUID(),
      sessionId: randomUUID(),
    })
    expect(() => tokenService.verifyAccessToken(token)).toThrow()
  })

  it('cannot verify an investor JWT with the sales token service', () => {
    const investorToken = tokenService.signAccessToken({
      userId: randomUUID(),
      role: 'USER',
      staffRole: null,
      sessionId: randomUUID(),
    })
    expect(() => salesTokenService.verifyAccessToken(investorToken)).toThrow()
  })

  it('rejects a token signed with the investor secret even if claims look like sales', () => {
    const fake = jwt.sign(
      {
        sub: randomUUID(),
        sid: randomUUID(),
        typ: 'salesman',
        jti: randomUUID(),
        iss: env.JWT_SALES_ISSUER,
        aud: env.JWT_SALES_AUDIENCE,
      },
      env.JWT_ACCESS_SECRET,
      { algorithm: 'HS256', expiresIn: '15m' },
    )
    expect(() => salesTokenService.verifyAccessToken(fake)).toThrow()
  })
})
