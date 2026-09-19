import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'

import { prisma } from '../database/prisma.js'
import { AppError, badRequest, forbidden, notFound } from '../utils/errors.js'
import { d, moneyDisplay } from '../utils/money.js'
import { adminUserHistoryService } from './admin-user-history.service.js'
import { auditService } from './audit.service.js'
import {
  buildTemplateCsv,
  buildTemplateXlsx,
  HISTORICAL_IMPORT_MAX_BYTES,
  HISTORICAL_IMPORT_MAX_MB,
  HISTORICAL_IMPORT_MAX_ROWS,
  mapRows,
  parseCsv,
  parseXlsx,
  sha256Hex,
  validateParsedRows,
  type ValidatedHistoryRow,
} from './historical-import-parse.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

function importRef() {
  return `IMP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`
}

function historyIdempotency(userId: string, orderId: string) {
  return `imp:${userId.replace(/-/g, '')}:${orderId}`.slice(0, 120)
}

async function requireAdminCreatedInvestor(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      deletedAt: true,
      createdByAdminId: true,
    },
  })
  if (!user || user.deletedAt) throw notFound('User not found.')
  if (user.role !== 'USER') throw badRequest('Historical import is only for investor accounts.')
  if (!user.createdByAdminId) {
    throw forbidden('Historical import is only available for users created from Admin → Create user.')
  }
  return user
}

function moneySum(rows: ValidatedHistoryRow[], activity: ValidatedHistoryRow['activity']) {
  return rows
    .filter((row) => row.activity === activity && row.outcome === 'READY')
    .reduce((acc, row) => acc.plus(d(row.amount)), d(0))
}

function toHistoryBody(row: ValidatedHistoryRow, userId: string) {
  const noteParts = [
    row.notes,
    row.relatedInvestment ? `Related investment ${row.relatedInvestment}` : null,
    row.referralFrom ? `Referral from ${row.referralFrom}` : null,
  ].filter(Boolean)
  return {
    activity: row.activity,
    occurredAt: new Date(row.occurredAt),
    amount: row.amount,
    currency: row.currency,
    note: noteParts.join('. ') || undefined,
    reference: row.orderId,
    userReference: row.reference ?? undefined,
    returnPct: row.returnPct ?? undefined,
    idempotencyKey: historyIdempotency(userId, row.orderId),
    source: 'HISTORICAL_IMPORT' as const,
  }
}

async function markDuplicates(userId: string, rows: ValidatedHistoryRow[]): Promise<ValidatedHistoryRow[]> {
  const orderIds = rows.filter((r) => r.outcome === 'READY').map((r) => r.orderId)
  if (orderIds.length === 0) return rows
  const keys = orderIds.map((id) => historyIdempotency(userId, id))
  const lookupKeys = [
    ...keys,
    ...keys.map((key) => `${key}:ledger`.slice(0, 120)),
    ...keys.map((key) => `${key}:dist`.slice(0, 160)),
  ]
  const [deposits, withdrawals, txns, runs] = await Promise.all([
    prisma.deposit.findMany({
      where: { OR: [{ reference: { in: orderIds } }, { idempotencyKey: { in: keys } }] },
      select: { reference: true, idempotencyKey: true },
    }),
    prisma.withdrawal.findMany({
      where: { OR: [{ reference: { in: orderIds } }, { idempotencyKey: { in: keys } }] },
      select: { reference: true, idempotencyKey: true },
    }),
    prisma.transaction.findMany({
      where: { idempotencyKey: { in: lookupKeys } },
      select: { idempotencyKey: true },
    }),
    prisma.dailyReturnRun.findMany({
      where: { idempotencyKey: { in: keys } },
      select: { idempotencyKey: true },
    }),
  ])
  const existing = new Set<string>([
    ...deposits.map((r) => r.reference),
    ...withdrawals.map((r) => r.reference),
    ...deposits.map((r) => r.idempotencyKey),
    ...withdrawals.map((r) => r.idempotencyKey),
    ...txns.map((r) => r.idempotencyKey).filter((k): k is string => Boolean(k)),
    ...runs.map((r) => r.idempotencyKey),
  ])
  return rows.map((row) => {
    if (row.outcome !== 'READY') return row
    const key = historyIdempotency(userId, row.orderId)
    const ledgerKey = `${key}:ledger`.slice(0, 120)
    if (existing.has(row.orderId) || existing.has(key) || existing.has(ledgerKey)) {
      return {
        ...row,
        outcome: 'SKIPPED',
        skipReason: `${row.orderId} already exists. SKIPPED — duplicate`,
      }
    }
    return row
  })
}

async function applyBalanceGate(userId: string, rows: ValidatedHistoryRow[]) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId_kind: { userId, kind: 'INVESTMENT' } },
    select: { availableBalance: true },
  })
  let available = d(wallet?.availableBalance ?? 0)
  const referralWallet = await prisma.wallet.findUnique({
    where: { userId_kind: { userId, kind: 'REFERRAL' } },
    select: { availableBalance: true },
  })
  let referral = d(referralWallet?.availableBalance ?? 0)
  const invalid: Array<{ rowNumber: number; reason: string }> = []
  const ordered = [...rows].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  for (const row of ordered) {
    if (row.outcome !== 'READY') continue
    const amt = d(row.amount)
    if (row.activity === 'DEPOSIT' || row.activity === 'PROFIT') available = available.plus(amt)
    if (row.activity === 'REFERRAL') referral = referral.plus(amt)
    if (row.activity === 'WITHDRAWAL') {
      if (amt.gt(available)) {
        invalid.push({
          rowNumber: row.rowNumber,
          reason: 'Amount exceeds available balance after prior rows',
        })
      } else {
        available = available.minus(amt)
      }
    }
  }
  return invalid
}

function summaryFrom(rows: ValidatedHistoryRow[], invalidCount: number) {
  const ready = rows.filter((r) => r.outcome === 'READY')
  const skipped = rows.filter((r) => r.outcome === 'SKIPPED')
  const deposits = ready.filter((r) => r.activity === 'DEPOSIT')
  const withdrawals = ready.filter((r) => r.activity === 'WITHDRAWAL')
  const profits = ready.filter((r) => r.activity === 'PROFIT')
  const referrals = ready.filter((r) => r.activity === 'REFERRAL')
  return {
    rows: rows.length + invalidCount,
    deposits: deposits.length,
    depositTotal: moneyDisplay(moneySum(ready, 'DEPOSIT')),
    withdrawals: withdrawals.length,
    withdrawalTotal: moneyDisplay(moneySum(ready, 'WITHDRAWAL')),
    profitRecords: profits.length,
    profitTotal: moneyDisplay(moneySum(ready, 'PROFIT')),
    referralRecords: referrals.length,
    referralTotal: moneyDisplay(moneySum(ready, 'REFERRAL')),
    validRows: ready.length,
    skippedRows: skipped.length,
    invalidRows: invalidCount,
  }
}

function mapImport(row: {
  id: string
  reference: string
  fileName: string
  status: string
  rowCount: number
  validCount: number
  invalidCount: number
  skippedCount: number
  importedCount: number
  summary: Prisma.JsonValue
  createdAt: Date
  confirmedAt: Date | null
  completedAt: Date | null
  errorMessage: string | null
  user: { id: string; firstName: string; lastName: string }
  uploadedBy: { id: string; firstName: string; lastName: string; email: string }
}) {
  return {
    id: row.id,
    importId: row.reference,
    fileName: row.fileName,
    status: row.status,
    rowCount: row.rowCount,
    validCount: row.validCount,
    invalidCount: row.invalidCount,
    skippedCount: row.skippedCount,
    importedCount: row.importedCount,
    summary: row.summary,
    createdAt: row.createdAt.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    errorMessage: row.errorMessage,
    user: {
      id: row.user.id,
      name: `${row.user.firstName} ${row.user.lastName}`.trim(),
    },
    uploadedBy: {
      id: row.uploadedBy.id,
      name: `${row.uploadedBy.firstName} ${row.uploadedBy.lastName}`.trim(),
      email: row.uploadedBy.email,
    },
  }
}

export const historicalImportService = {
  templateCsv() {
    return {
      filename: 'wealthora-historical-import-sample.csv',
      contentType: 'text/csv; charset=utf-8',
      body: Buffer.from(buildTemplateCsv(), 'utf8'),
    }
  },

  templateXlsx() {
    return {
      filename: 'wealthora-historical-import-sample.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: buildTemplateXlsx(),
    }
  },

  async preview(
    actorId: string,
    userId: string,
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number },
    _context: Ctx,
  ) {
    const user = await requireAdminCreatedInvestor(userId)
    if (!file.buffer?.length) throw badRequest('Empty upload rejected.')
    if (file.size > HISTORICAL_IMPORT_MAX_BYTES || file.buffer.length > HISTORICAL_IMPORT_MAX_BYTES) {
      throw badRequest(`File exceeds ${HISTORICAL_IMPORT_MAX_MB}MB.`)
    }
    const name = file.originalname.toLowerCase()
    const isCsv = name.endsWith('.csv')
    const isXlsx = name.endsWith('.xlsx')
    if (!isCsv && !isXlsx) throw badRequest('Only .csv and .xlsx files are supported.')
    if (isXlsx && file.buffer.toString('ascii', 0, 2) !== 'PK') {
      throw badRequest('File content does not match XLSX type.')
    }
    if (isCsv && file.buffer.includes(0)) {
      throw badRequest('Binary content is not allowed in CSV uploads.')
    }
    let table: string[][]
    try {
      table = isCsv ? parseCsv(file.buffer.toString('utf8')) : parseXlsx(file.buffer)
    } catch (err) {
      throw badRequest(err instanceof Error ? err.message : 'Could not parse file.')
    }
    if (table.length > HISTORICAL_IMPORT_MAX_ROWS + 20) {
      throw badRequest(`File has too many rows. Maximum is ${HISTORICAL_IMPORT_MAX_ROWS}.`)
    }
    let parsed
    try {
      parsed = mapRows(table)
    } catch (err) {
      throw badRequest(err instanceof Error ? err.message : 'Missing required columns.')
    }
    if (parsed.length > HISTORICAL_IMPORT_MAX_ROWS) {
      throw badRequest(`File has too many data rows. Maximum is ${HISTORICAL_IMPORT_MAX_ROWS}.`)
    }
    const { valid, invalid } = validateParsedRows(parsed)
    const withDupes = await markDuplicates(userId, valid)
    const balanceIssues = await applyBalanceGate(userId, withDupes)
    const overdraftRows = new Set(balanceIssues.map((issue) => issue.rowNumber))
    const stillReady = withDupes.filter(
      (row) => row.outcome !== 'READY' || !overdraftRows.has(row.rowNumber),
    )
    const invalidAll = [
      ...invalid,
      ...balanceIssues.map((issue) => ({ rowNumber: issue.rowNumber, reason: issue.reason })),
    ]
    const digest = sha256Hex(file.buffer)
    const summary = summaryFrom(stillReady, invalidAll.length)
    const created = await prisma.historicalImport.create({
      data: {
        id: randomUUID(),
        reference: importRef(),
        userId,
        uploadedById: actorId,
        fileName: file.originalname.slice(0, 200),
        fileSha256: digest,
        status: 'PREVIEW',
        rowCount: parsed.length,
        validCount: stillReady.filter((r) => r.outcome === 'READY').length,
        invalidCount: invalidAll.length,
        skippedCount: stillReady.filter((r) => r.outcome === 'SKIPPED').length,
        summary,
        preview: {
          ignoredUserIds: parsed.some((r) => r.ignoredUserIdRaw.trim().length > 0),
          user: { id: user.id, name: `${user.firstName} ${user.lastName}`.trim() },
          rows: stillReady,
          invalid: invalidAll,
        } as Prisma.InputJsonValue,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })
    return {
      ...mapImport(created),
      preview: created.preview,
    }
  },

  async get(actorUserId: string, userId: string, importId: string) {
    await requireAdminCreatedInvestor(userId)
    const row = await prisma.historicalImport.findFirst({
      where: { id: importId, userId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })
    if (!row) throw notFound('Import not found.')
    void actorUserId
    return { ...mapImport(row), preview: row.preview }
  },

  async list(userId: string) {
    await requireAdminCreatedInvestor(userId)
    const items = await prisma.historicalImport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })
    return { items: items.map(mapImport) }
  },

  async cancel(userId: string, importId: string) {
    await requireAdminCreatedInvestor(userId)
    const row = await prisma.historicalImport.findFirst({ where: { id: importId, userId } })
    if (!row) throw notFound('Import not found.')
    if (row.status !== 'PREVIEW') throw badRequest('Only a previewed import can be cancelled.')
    const updated = await prisma.historicalImport.update({
      where: { id: row.id },
      data: { status: 'CANCELLED' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })
    return mapImport(updated)
  },

  async confirm(actorId: string, userId: string, importId: string, context: Ctx) {
    const user = await requireAdminCreatedInvestor(userId)
    const row = await prisma.historicalImport.findFirst({
      where: { id: importId, userId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })
    if (!row) throw notFound('Import not found.')
    if (row.status === 'COMPLETED') {
      return {
        ...mapImport(row),
        confirmation: `Imported ${row.importedCount} historical records into ${user.firstName} ${user.lastName}.`,
      }
    }
    if (row.status === 'PREVIEW' && row.confirmedAt) {
      throw badRequest('This import is already being confirmed. Wait and refresh.')
    }
    if (row.status !== 'PREVIEW') throw badRequest('This import is not awaiting confirmation.')
    const preview = row.preview as {
      rows?: ValidatedHistoryRow[]
      invalid?: Array<{ rowNumber: number; reason: string }>
    }
    const invalid = preview.invalid ?? []
    if (invalid.length > 0) {
      throw badRequest('Fix invalid rows before confirming this import.')
    }
    const ready = (preview.rows ?? []).filter((item) => item.outcome === 'READY')
    if (ready.length === 0) {
      const empty = await prisma.historicalImport.update({
        where: { id: row.id },
        data: {
          status: 'COMPLETED',
          importedCount: 0,
          confirmedAt: new Date(),
          completedAt: new Date(),
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      })
      return mapImport(empty)
    }
    const refreshed = await markDuplicates(userId, ready)
    const stillReady = refreshed.filter((item) => item.outcome === 'READY')
    const balanceIssues = await applyBalanceGate(userId, stillReady)
    if (balanceIssues.length > 0) {
      throw badRequest(balanceIssues[0]?.reason ?? 'Import would overdraft the available balance.')
    }
    const claimed = await prisma.historicalImport.updateMany({
      where: { id: row.id, userId, status: 'PREVIEW', confirmedAt: null },
      data: { confirmedAt: new Date() },
    })
    if (claimed.count === 0) {
      const latest = await prisma.historicalImport.findFirst({
        where: { id: importId, userId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      })
      if (latest?.status === 'COMPLETED') {
        return {
          ...mapImport(latest),
          confirmation: `Imported ${latest.importedCount} historical records into ${user.firstName} ${user.lastName}.`,
        }
      }
      throw badRequest('This import is already being confirmed. Wait and refresh.')
    }
    const bodies = stillReady
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
      .map((item) => toHistoryBody(item, userId))
    try {
      await adminUserHistoryService.createMany(actorId, userId, bodies, context)
    } catch (err) {
      await prisma.historicalImport.update({
        where: { id: row.id },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message.slice(0, 2000) : 'Import failed.',
        },
      })
      if (err instanceof AppError) throw err
      throw badRequest('Import failed and was rolled back. No financial records were kept.')
    }
    await auditService.record({
      actorId,
      targetUserId: userId,
      action: 'user.history.import',
      module: 'users',
      newValue: {
        importId: row.reference,
        fileName: row.fileName,
        imported: bodies.length,
        skipped: row.skippedCount + refreshed.filter((item) => item.outcome === 'SKIPPED').length,
        source: 'HISTORICAL_IMPORT',
      },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    const updated = await prisma.historicalImport.update({
      where: { id: row.id },
      data: {
        status: 'COMPLETED',
        importedCount: bodies.length,
        skippedCount: row.skippedCount + refreshed.filter((item) => item.outcome === 'SKIPPED').length,
        confirmedAt: new Date(),
        completedAt: new Date(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })
    return {
      ...mapImport(updated),
      confirmation: `Imported ${bodies.length} historical records into ${user.firstName} ${user.lastName}.`,
    }
  },
}
