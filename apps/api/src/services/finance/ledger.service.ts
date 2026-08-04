import type {
  LedgerEntryType,
  Prisma,
  TransactionType,
  Wallet,
  WalletKind,
} from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { prisma } from '../../database/prisma.js'
import { badRequest, conflict } from '../../utils/errors.js'
import { assertPositive, d, moneyString, type Decimal } from '../../utils/money.js'

type TxClient = Prisma.TransactionClient

const SYSTEM_CODES = {
  CLEARING: 'SYS:CLEARING',
  PAYOUT: 'SYS:PAYOUT',
  FEES: 'SYS:FEES',
  SUSPENSE: 'SYS:SUSPENSE',
} as const

const WALLET_KINDS: WalletKind[] = ['INVESTMENT', 'PROFIT', 'BONUS', 'REFERRAL']

function refId(prefix: string): string {
  return `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`
}

async function lockWallet(tx: TxClient, walletId: string): Promise<Wallet> {
  // Row lock first (raw), then re-read through Prisma for camelCase Decimal fields.
  await tx.$executeRaw`SELECT 1 FROM wallets WHERE id = ${walletId}::uuid FOR UPDATE`
  const wallet = await tx.wallet.findUnique({ where: { id: walletId } })
  if (!wallet) throw badRequest('Wallet not found.')
  return wallet
}

async function getSystemAccount(tx: TxClient, code: string) {
  const account = await tx.ledgerAccount.findUnique({ where: { code } })
  if (!account) throw badRequest(`System ledger account missing: ${code}`)
  return account
}

async function ensureUserAccounts(tx: TxClient, wallet: Wallet) {
  const availableCode = `USER:${wallet.userId}:${wallet.kind}:AVAILABLE`
  const lockedCode = `USER:${wallet.userId}:${wallet.kind}:LOCKED`

  const available =
    (await tx.ledgerAccount.findUnique({ where: { code: availableCode } })) ??
    (await tx.ledgerAccount.create({
      data: {
        code: availableCode,
        name: `${wallet.kind} Available`,
        accountType: 'ASSET',
        userId: wallet.userId,
        walletId: wallet.id,
      },
    }))

  const locked =
    (await tx.ledgerAccount.findUnique({ where: { code: lockedCode } })) ??
    (await tx.ledgerAccount.create({
      data: {
        code: lockedCode,
        name: `${wallet.kind} Locked`,
        accountType: 'ASSET',
        userId: wallet.userId,
        walletId: wallet.id,
      },
    }))

  return { available, locked }
}

type PostLine = {
  accountId: string
  walletId?: string | null
  direction: 'DEBIT' | 'CREDIT'
  amount: Decimal
  entryType: LedgerEntryType
  signedAmount: Decimal
  balanceBefore?: Decimal
  balanceAfter?: Decimal
  description?: string
  referenceType?: string
  referenceId?: string
  idempotencyKey?: string
}

async function postBalanced(
  tx: TxClient,
  input: {
    userId: string
    type: TransactionType
    amount: Decimal
    description: string
    createdById?: string | null
    idempotencyKey?: string | null
    auditRef?: string | null
    metadata?: Record<string, unknown>
    lines: PostLine[]
  },
) {
  if (input.idempotencyKey) {
    const existing = await tx.transaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { entries: true },
    })
    if (existing) return existing
  }

  const debit = input.lines
    .filter((l) => l.direction === 'DEBIT')
    .reduce((acc, l) => acc.plus(l.amount), d(0))
  const credit = input.lines
    .filter((l) => l.direction === 'CREDIT')
    .reduce((acc, l) => acc.plus(l.amount), d(0))
  if (!debit.eq(credit)) {
    throw badRequest('Unbalanced ledger entry rejected.')
  }

  const transaction = await tx.transaction.create({
    data: {
      referenceId: refId('TXN'),
      userId: input.userId,
      type: input.type,
      status: 'POSTED',
      amount: moneyString(input.amount),
      description: input.description,
      idempotencyKey: input.idempotencyKey ?? null,
      createdById: input.createdById ?? null,
      auditRef: input.auditRef ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      postedAt: new Date(),
    },
  })

  for (const line of input.lines) {
    await tx.ledgerEntry.create({
      data: {
        transactionId: transaction.id,
        accountId: line.accountId,
        walletId: line.walletId ?? null,
        direction: line.direction,
        amount: moneyString(line.amount),
        signedAmount: moneyString(line.signedAmount),
        entryType: line.entryType,
        balanceBefore: line.balanceBefore ? moneyString(line.balanceBefore) : null,
        balanceAfter: line.balanceAfter ? moneyString(line.balanceAfter) : null,
        description: line.description ?? input.description,
        referenceType: line.referenceType ?? null,
        referenceId: line.referenceId ?? null,
        idempotencyKey: line.idempotencyKey ?? null,
        createdById: input.createdById ?? null,
      },
    })
  }

  await tx.transactionHistory.create({
    data: {
      transactionId: transaction.id,
      userId: input.userId,
      event: 'POSTED',
      status: 'POSTED',
      amount: moneyString(input.amount),
      currency: 'USD',
      message: input.description,
    },
  })

  return tx.transaction.findUniqueOrThrow({
    where: { id: transaction.id },
    include: { entries: true },
  })
}

export const ledgerService = {
  async ensureWalletsForUser(userId: string, client: TxClient | typeof prisma = prisma) {
    for (const kind of WALLET_KINDS) {
      const wallet =
        (await client.wallet.findUnique({ where: { userId_kind: { userId, kind } } })) ??
        (await client.wallet.create({
          data: { userId, kind, currency: 'USD' },
        }))
      await ensureUserAccounts(client, wallet)
    }
    return client.wallet.findMany({ where: { userId }, orderBy: { kind: 'asc' } })
  },

  async getInvestmentWallet(userId: string, client: TxClient | typeof prisma = prisma) {
    await this.ensureWalletsForUser(userId, client)
    return client.wallet.findUniqueOrThrow({
      where: { userId_kind: { userId, kind: 'INVESTMENT' } },
    })
  },

  /** Credit available balance (deposit approve / adjustment). */
  async creditAvailable(
    tx: TxClient,
    params: {
      userId: string
      walletId: string
      amount: Decimal
      entryType: LedgerEntryType
      transactionType: TransactionType
      description: string
      referenceType: string
      referenceId: string
      createdById?: string | null
      idempotencyKey: string
      bumpDeposited?: boolean
      bumpInvested?: boolean
      bumpProfit?: boolean
    },
  ) {
    assertPositive(params.amount)
    const wallet = await lockWallet(tx, params.walletId)
    if (wallet.userId !== params.userId) throw badRequest('Wallet ownership mismatch.')

    const accounts = await ensureUserAccounts(tx, wallet)
    const clearing = await getSystemAccount(tx, SYSTEM_CODES.CLEARING)
    const before = d(wallet.balance)
    const after = before.plus(params.amount)
    const availableAfter = d(wallet.availableBalance).plus(params.amount)

    const posted = await postBalanced(tx, {
      userId: params.userId,
      type: params.transactionType,
      amount: params.amount,
      description: params.description,
      createdById: params.createdById,
      idempotencyKey: params.idempotencyKey,
      auditRef: `${params.referenceType}:${params.referenceId}`,
      lines: [
        {
          accountId: clearing.id,
          direction: 'DEBIT',
          amount: params.amount,
          signedAmount: params.amount,
          entryType: params.entryType,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          idempotencyKey: `${params.idempotencyKey}:clearing`,
        },
        {
          accountId: accounts.available.id,
          walletId: wallet.id,
          direction: 'CREDIT',
          amount: params.amount,
          signedAmount: params.amount,
          entryType: params.entryType,
          balanceBefore: before,
          balanceAfter: after,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          idempotencyKey: `${params.idempotencyKey}:available`,
        },
      ],
    })

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: moneyString(after),
        availableBalance: moneyString(availableAfter),
        version: { increment: 1 },
        ...(params.bumpDeposited
          ? { totalDeposited: moneyString(d(wallet.totalDeposited).plus(params.amount)) }
          : {}),
        ...(params.bumpInvested
          ? { investedAmount: moneyString(d(wallet.investedAmount).plus(params.amount)) }
          : {}),
        ...(params.bumpProfit
          ? { totalProfit: moneyString(d(wallet.totalProfit).plus(params.amount)) }
          : {}),
      },
    })

    return posted
  },

  /** Lock funds for withdrawal request. */
  async lockFunds(
    tx: TxClient,
    params: {
      userId: string
      walletId: string
      amount: Decimal
      description: string
      referenceType: string
      referenceId: string
      createdById?: string | null
      idempotencyKey: string
    },
  ) {
    assertPositive(params.amount)
    const wallet = await lockWallet(tx, params.walletId)
    if (wallet.userId !== params.userId) throw badRequest('Wallet ownership mismatch.')
    if (d(wallet.availableBalance).lt(params.amount)) {
      throw conflict('Insufficient available balance.')
    }

    const accounts = await ensureUserAccounts(tx, wallet)
    const before = d(wallet.balance)
    const availableAfter = d(wallet.availableBalance).minus(params.amount)
    const lockedAfter = d(wallet.lockedBalance).plus(params.amount)

    const posted = await postBalanced(tx, {
      userId: params.userId,
      type: 'WITHDRAWAL',
      amount: params.amount,
      description: params.description,
      createdById: params.createdById,
      idempotencyKey: params.idempotencyKey,
      auditRef: `${params.referenceType}:${params.referenceId}`,
      lines: [
        {
          accountId: accounts.available.id,
          walletId: wallet.id,
          direction: 'DEBIT',
          amount: params.amount,
          signedAmount: params.amount.neg(),
          entryType: 'WITHDRAWAL_LOCKED',
          balanceBefore: before,
          balanceAfter: before,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          idempotencyKey: `${params.idempotencyKey}:available`,
        },
        {
          accountId: accounts.locked.id,
          walletId: wallet.id,
          direction: 'CREDIT',
          amount: params.amount,
          signedAmount: d(0),
          entryType: 'WITHDRAWAL_LOCKED',
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          idempotencyKey: `${params.idempotencyKey}:locked`,
        },
      ],
    })

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: moneyString(availableAfter),
        lockedBalance: moneyString(lockedAfter),
        version: { increment: 1 },
      },
    })

    return posted
  },

  /** Complete withdrawal: release locked funds out of the system. */
  async completeWithdrawal(
    tx: TxClient,
    params: {
      userId: string
      walletId: string
      amount: Decimal
      description: string
      referenceType: string
      referenceId: string
      createdById?: string | null
      idempotencyKey: string
    },
  ) {
    assertPositive(params.amount)
    const wallet = await lockWallet(tx, params.walletId)
    if (d(wallet.lockedBalance).lt(params.amount)) {
      throw conflict('Locked balance is insufficient to complete withdrawal.')
    }

    const accounts = await ensureUserAccounts(tx, wallet)
    const payout = await getSystemAccount(tx, SYSTEM_CODES.PAYOUT)
    const before = d(wallet.balance)
    const after = before.minus(params.amount)
    const lockedAfter = d(wallet.lockedBalance).minus(params.amount)

    const posted = await postBalanced(tx, {
      userId: params.userId,
      type: 'WITHDRAWAL',
      amount: params.amount,
      description: params.description,
      createdById: params.createdById,
      idempotencyKey: params.idempotencyKey,
      auditRef: `${params.referenceType}:${params.referenceId}`,
      lines: [
        {
          accountId: accounts.locked.id,
          walletId: wallet.id,
          direction: 'DEBIT',
          amount: params.amount,
          signedAmount: params.amount.neg(),
          entryType: 'WITHDRAWAL_COMPLETED',
          balanceBefore: before,
          balanceAfter: after,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          idempotencyKey: `${params.idempotencyKey}:locked`,
        },
        {
          accountId: payout.id,
          direction: 'CREDIT',
          amount: params.amount,
          signedAmount: params.amount,
          entryType: 'WITHDRAWAL_COMPLETED',
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          idempotencyKey: `${params.idempotencyKey}:payout`,
        },
      ],
    })

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: moneyString(after),
        lockedBalance: moneyString(lockedAfter),
        totalWithdrawn: moneyString(d(wallet.totalWithdrawn).plus(params.amount)),
        version: { increment: 1 },
      },
    })

    return posted
  },

  /** Unlock / refund a pending withdrawal lock. */
  async unlockFunds(
    tx: TxClient,
    params: {
      userId: string
      walletId: string
      amount: Decimal
      description: string
      referenceType: string
      referenceId: string
      createdById?: string | null
      idempotencyKey: string
    },
  ) {
    assertPositive(params.amount)
    const wallet = await lockWallet(tx, params.walletId)
    if (d(wallet.lockedBalance).lt(params.amount)) {
      throw conflict('Locked balance is insufficient to unlock.')
    }

    const accounts = await ensureUserAccounts(tx, wallet)
    const before = d(wallet.balance)
    const availableAfter = d(wallet.availableBalance).plus(params.amount)
    const lockedAfter = d(wallet.lockedBalance).minus(params.amount)

    const posted = await postBalanced(tx, {
      userId: params.userId,
      type: 'REFUND',
      amount: params.amount,
      description: params.description,
      createdById: params.createdById,
      idempotencyKey: params.idempotencyKey,
      auditRef: `${params.referenceType}:${params.referenceId}`,
      lines: [
        {
          accountId: accounts.locked.id,
          walletId: wallet.id,
          direction: 'DEBIT',
          amount: params.amount,
          signedAmount: d(0),
          entryType: 'WITHDRAWAL_REFUNDED',
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          idempotencyKey: `${params.idempotencyKey}:locked`,
        },
        {
          accountId: accounts.available.id,
          walletId: wallet.id,
          direction: 'CREDIT',
          amount: params.amount,
          signedAmount: params.amount,
          entryType: 'WITHDRAWAL_REFUNDED',
          balanceBefore: before,
          balanceAfter: before,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          idempotencyKey: `${params.idempotencyKey}:available`,
        },
      ],
    })

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: moneyString(availableAfter),
        lockedBalance: moneyString(lockedAfter),
        version: { increment: 1 },
      },
    })

    return posted
  },

  async adjustPending(
    tx: TxClient,
    walletId: string,
    delta: Decimal,
  ): Promise<void> {
    const wallet = await lockWallet(tx, walletId)
    const next = d(wallet.pendingBalance).plus(delta)
    if (next.lt(0)) throw conflict('Pending balance cannot go negative.')
    await tx.wallet.update({
      where: { id: walletId },
      data: { pendingBalance: moneyString(next), version: { increment: 1 } },
    })
  },

  /** Debit available balance (admin adjustment). */
  async debitAvailable(
    tx: TxClient,
    params: {
      userId: string
      walletId: string
      amount: Decimal
      description: string
      referenceType: string
      referenceId: string
      createdById?: string | null
      idempotencyKey: string
    },
  ) {
    assertPositive(params.amount)
    const wallet = await lockWallet(tx, params.walletId)
    if (wallet.userId !== params.userId) throw badRequest('Wallet ownership mismatch.')
    if (d(wallet.availableBalance).lt(params.amount)) {
      throw conflict('Insufficient available balance.')
    }

    const accounts = await ensureUserAccounts(tx, wallet)
    const clearing = await getSystemAccount(tx, SYSTEM_CODES.CLEARING)
    const before = d(wallet.balance)
    const after = before.minus(params.amount)
    const availableAfter = d(wallet.availableBalance).minus(params.amount)

    const posted = await postBalanced(tx, {
      userId: params.userId,
      type: 'ADMIN_ADJUSTMENT',
      amount: params.amount,
      description: params.description,
      createdById: params.createdById,
      idempotencyKey: params.idempotencyKey,
      auditRef: `${params.referenceType}:${params.referenceId}`,
      lines: [
        {
          accountId: accounts.available.id,
          walletId: wallet.id,
          direction: 'DEBIT',
          amount: params.amount,
          signedAmount: params.amount.neg(),
          entryType: 'ADJUSTMENT_DEBIT',
          balanceBefore: before,
          balanceAfter: after,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          idempotencyKey: `${params.idempotencyKey}:available`,
        },
        {
          accountId: clearing.id,
          direction: 'CREDIT',
          amount: params.amount,
          signedAmount: params.amount,
          entryType: 'ADJUSTMENT_DEBIT',
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          idempotencyKey: `${params.idempotencyKey}:clearing`,
        },
      ],
    })

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: moneyString(after),
        availableBalance: moneyString(availableAfter),
        version: { increment: 1 },
      },
    })

    return posted
  },
}
