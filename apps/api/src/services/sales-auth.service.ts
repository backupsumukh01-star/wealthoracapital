import { ERROR_CODES } from '@meridian/shared'
import { randomUUID } from 'node:crypto'
import type { Salesman, SalesmanSession } from '@prisma/client'

import { env } from '../config/env.js'
import { DUMMY_PASSWORD_HASH } from '../config/constants.js'
import { prisma } from '../database/prisma.js'
import { passwordService } from './password.service.js'
import { salesTokenService } from './sales-token.service.js'
import { tokenService } from './token.service.js'
import type { SessionContext } from '../types/auth.types.js'
import { AppError, unauthorized } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import type { z } from 'zod'
import type { salesLoginSchema } from '../validators/sales.validators.js'

type SalesLoginInput = z.infer<typeof salesLoginSchema>

export type SalesAuthTokens = {
  accessToken: string
  refreshToken: string
  accessTokenMaxAgeMs: number
  refreshTokenMaxAgeMs: number
}

function publicSalesman(row: Salesman) {
  const site = env.APP_URL.replace(/\/$/, '')
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    code: row.code,
    status: row.status,
    referralLink: `${site}/register?ref=${encodeURIComponent(row.code)}`,
  }
}

async function issueSalesTokens(
  salesman: Salesman,
  context: SessionContext,
): Promise<{ tokens: SalesAuthTokens; session: SalesmanSession }> {
  const refresh = tokenService.createOpaqueRefreshToken()
  const familyId = randomUUID()
  const refreshTokenMaxAgeMs = salesTokenService.refreshTokenTtlMs()
  const accessTokenMaxAgeMs = salesTokenService.accessTokenTtlMs()

  const session = await prisma.salesmanSession.create({
    data: {
      salesmanId: salesman.id,
      refreshTokenHash: refresh.hash,
      familyId,
      userAgent: context.userAgent?.slice(0, 400) ?? null,
      ip: context.ip,
      expiresAt: new Date(Date.now() + refreshTokenMaxAgeMs),
    },
  })

  const accessToken = salesTokenService.signAccessToken({
    salesmanId: salesman.id,
    sessionId: session.id,
  })

  return {
    session,
    tokens: {
      accessToken,
      refreshToken: refresh.raw,
      accessTokenMaxAgeMs,
      refreshTokenMaxAgeMs,
    },
  }
}

export const salesAuthService = {
  async login(input: SalesLoginInput, context: SessionContext) {
    const salesman = await prisma.salesman.findUnique({
      where: { email: input.email },
    })

    if (!salesman) {
      await passwordService.verify(input.password, DUMMY_PASSWORD_HASH)
      throw unauthorized('Incorrect email or password.')
    }

    if (salesman.status === 'DISABLED') {
      throw new AppError(403, ERROR_CODES.ACCOUNT_SUSPENDED, 'This account has been disabled.')
    }

    const valid = await passwordService.verify(input.password, salesman.passwordHash)
    if (!valid) {
      throw unauthorized('Incorrect email or password.')
    }

    const { tokens } = await issueSalesTokens(salesman, context)
    logger.info({ salesmanId: salesman.id }, 'Salesman logged in')
    return {
      salesman: publicSalesman(salesman),
      tokens,
    }
  },

  async me(salesmanId: string) {
    const salesman = await prisma.salesman.findUnique({ where: { id: salesmanId } })
    if (!salesman || salesman.status === 'DISABLED') {
      throw unauthorized('Authentication required.')
    }
    return { salesman: publicSalesman(salesman) }
  },

  async logout(sessionId: string | undefined): Promise<void> {
    if (!sessionId) return
    await prisma.salesmanSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  },

  async refresh(rawRefreshToken: string | undefined, context: SessionContext): Promise<SalesAuthTokens> {
    if (!rawRefreshToken) {
      throw unauthorized('Refresh token missing.')
    }

    const hash = tokenService.hashToken(rawRefreshToken)
    const existing = await prisma.salesmanSession.findUnique({
      where: { refreshTokenHash: hash },
    })
    if (!existing) {
      throw unauthorized('Invalid refresh token.')
    }

    if (existing.revokedAt) {
      await prisma.salesmanSession.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      throw unauthorized('Refresh token reuse detected. Please sign in again.')
    }

    if (existing.expiresAt <= new Date()) {
      await prisma.salesmanSession.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      })
      throw unauthorized('Refresh token expired.')
    }

    const salesman = await prisma.salesman.findUnique({ where: { id: existing.salesmanId } })
    if (!salesman || salesman.status === 'DISABLED') {
      await prisma.salesmanSession.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      })
      throw unauthorized('Session is no longer valid.')
    }

    const nextRefresh = tokenService.createOpaqueRefreshToken()
    const refreshTokenMaxAgeMs = salesTokenService.refreshTokenTtlMs()
    const accessTokenMaxAgeMs = salesTokenService.accessTokenTtlMs()

    const rotated = await prisma.salesmanSession.create({
      data: {
        salesmanId: salesman.id,
        refreshTokenHash: nextRefresh.hash,
        familyId: existing.familyId,
        userAgent: context.userAgent?.slice(0, 400) ?? existing.userAgent,
        ip: context.ip ?? existing.ip,
        expiresAt: new Date(Date.now() + refreshTokenMaxAgeMs),
      },
    })

    await prisma.salesmanSession.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedById: rotated.id },
    })

    return {
      accessToken: salesTokenService.signAccessToken({
        salesmanId: salesman.id,
        sessionId: rotated.id,
      }),
      refreshToken: nextRefresh.raw,
      accessTokenMaxAgeMs,
      refreshTokenMaxAgeMs,
    }
  },
}
