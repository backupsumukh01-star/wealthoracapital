import type { Prisma } from '@prisma/client'

import { prisma } from '../database/prisma.js'

/** Prisma filter: live self-registered / Google investors only (never lookalike or staff). */
export const realInvestorUser: Prisma.UserWhereInput = {
  createdByAdminId: null,
  role: 'USER',
  deletedAt: null,
}

export function realDepositWhere(extra: Prisma.DepositWhereInput = {}): Prisma.DepositWhereInput {
  return { AND: [{ user: realInvestorUser }, extra] }
}

export function realWithdrawalWhere(
  extra: Prisma.WithdrawalWhereInput = {},
): Prisma.WithdrawalWhereInput {
  return { AND: [{ user: realInvestorUser }, extra] }
}

export function realKycWhere(
  extra: Prisma.KycSubmissionWhereInput = {},
): Prisma.KycSubmissionWhereInput {
  return { AND: [{ user: realInvestorUser }, extra] }
}

export function realProfitWhere(
  extra: Prisma.ProfitDistributionWhereInput = {},
): Prisma.ProfitDistributionWhereInput {
  return { AND: [{ user: realInvestorUser }, extra] }
}

export async function isDemoInvestor(userId: string): Promise<boolean> {
  const row = await prisma.user.findFirst({
    where: { id: userId, createdByAdminId: { not: null }, deletedAt: null },
    select: { id: true },
  })
  return Boolean(row)
}

