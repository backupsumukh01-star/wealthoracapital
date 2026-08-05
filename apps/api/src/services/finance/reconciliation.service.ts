import { prisma } from '../../database/prisma.js'
import { d, moneyString } from '../../utils/money.js'

export type ReconciliationIssue = {
  code: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  entityType?: string
  entityId?: string
  meta?: Record<string, unknown>
}

/**
 * Transaction reconciliation + ledger/wallet synchronization checks.
 */
export const reconciliationService = {
  async run(createdById?: string | null) {
    const issues: ReconciliationIssue[] = []

    // 1) Approved deposits missing ledger credit
    const approvedDeposits = await prisma.deposit.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, reference: true, creditedAmount: true, amount: true, transactionId: true },
      take: 5000,
    })
    for (const dep of approvedDeposits) {
      const ledger = await prisma.ledgerEntry.findFirst({
        where: { idempotencyKey: `deposit:${dep.id}:approve:available` },
      })
      // creditAvailable may use different suffix — also check reference
      const byRef =
        ledger ??
        (await prisma.ledgerEntry.findFirst({
          where: {
            referenceType: 'DEPOSIT',
            referenceId: dep.id,
            entryType: 'DEPOSIT_APPROVED',
          },
        }))
      if (!byRef && !dep.transactionId) {
        issues.push({
          code: 'DEPOSIT_MISSING_LEDGER',
          severity: 'critical',
          message: `Approved deposit ${dep.reference} has no ledger credit`,
          entityType: 'DEPOSIT',
          entityId: dep.id,
        })
      }
    }

    // 2) Paid withdrawals missing completion ledger
    const paidWithdrawals = await prisma.withdrawal.findMany({
      where: { status: { in: ['PAID', 'COMPLETED'] } },
      select: { id: true, reference: true },
      take: 5000,
    })
    for (const wd of paidWithdrawals) {
      const complete = await prisma.ledgerEntry.findFirst({
        where: {
          OR: [
            { idempotencyKey: `withdrawal:${wd.id}:complete:locked` },
            { referenceType: 'WITHDRAWAL', referenceId: wd.id, entryType: 'WITHDRAWAL_COMPLETED' },
          ],
        },
      })
      if (!complete) {
        issues.push({
          code: 'WITHDRAWAL_MISSING_LEDGER',
          severity: 'critical',
          message: `Paid withdrawal ${wd.reference} has no completion ledger entry`,
          entityType: 'WITHDRAWAL',
          entityId: wd.id,
        })
      }
    }

    // 3) Wallet balance vs ledger sum (ledger synchronization)
    const wallets = await prisma.wallet.findMany({
      where: { kind: 'INVESTMENT' },
      select: {
        id: true,
        userId: true,
        balance: true,
        availableBalance: true,
        lockedBalance: true,
      },
      take: 5000,
    })
    for (const wallet of wallets) {
      const agg = await prisma.ledgerEntry.aggregate({
        where: { walletId: wallet.id },
        _sum: { signedAmount: true },
      })
      const ledgerSum = d(agg._sum.signedAmount ?? 0)
      const walletBal = d(wallet.balance)
      if (!ledgerSum.eq(walletBal)) {
        // Allow tiny rounding noise — Decimal(20,8)
        const drift = ledgerSum.minus(walletBal).abs()
        if (drift.gte(d('0.00000001'))) {
          issues.push({
            code: 'WALLET_LEDGER_DRIFT',
            severity: drift.gt(d('0.01')) ? 'critical' : 'warning',
            message: `Wallet ${wallet.id} balance ${moneyString(walletBal)} ≠ ledger sum ${moneyString(ledgerSum)}`,
            entityType: 'WALLET',
            entityId: wallet.id,
            meta: {
              userId: wallet.userId,
              available: moneyString(wallet.availableBalance),
              locked: moneyString(wallet.lockedBalance),
              drift: moneyString(drift),
            },
          })
        }
      }
    }

    // 4) Stale approval queue
    const staleCutoff = new Date(Date.now() - 7 * 24 * 3_600_000)
    const staleQueue = await prisma.approvalQueue.count({
      where: { status: 'PENDING', createdAt: { lt: staleCutoff } },
    })
    if (staleQueue > 0) {
      issues.push({
        code: 'STALE_APPROVAL_QUEUE',
        severity: 'warning',
        message: `${staleQueue} approval queue item(s) pending > 7 days`,
        meta: { count: staleQueue },
      })
    }

    // 5) Failed webhooks
    const failedWebhooks = await prisma.paymentWebhookEvent.count({
      where: { status: 'FAILED' },
    })
    if (failedWebhooks > 0) {
      issues.push({
        code: 'FAILED_WEBHOOKS',
        severity: 'warning',
        message: `${failedWebhooks} payment webhook(s) in FAILED status`,
        meta: { count: failedWebhooks },
      })
    }

    // 6) Processed deposit.confirmed webhooks still PENDING (auto-confirm off)
    const confirmedPending = await prisma.paymentWebhookEvent.findMany({
      where: {
        eventType: 'deposit.confirmed',
        status: 'PROCESSED',
        depositId: { not: null },
      },
      select: { depositId: true, eventId: true },
      take: 500,
    })
    for (const ev of confirmedPending) {
      if (!ev.depositId) continue
      const dep = await prisma.deposit.findUnique({
        where: { id: ev.depositId },
        select: { id: true, status: true, reference: true },
      })
      if (dep && (dep.status === 'PENDING' || dep.status === 'UNDER_REVIEW')) {
        issues.push({
          code: 'PROVIDER_CONFIRMED_AWAITING_ADMIN',
          severity: 'info',
          message: `Deposit ${dep.reference} provider-confirmed, awaiting admin approval`,
          entityType: 'DEPOSIT',
          entityId: dep.id,
          meta: { eventId: ev.eventId },
        })
      }
    }

    const critical = issues.filter((i) => i.severity === 'critical').length
    const summary = {
      checkedAt: new Date().toISOString(),
      depositsApproved: approvedDeposits.length,
      withdrawalsPaid: paidWithdrawals.length,
      walletsChecked: wallets.length,
      issueCount: issues.length,
      critical,
      issues: issues.slice(0, 200),
    }

    const run = await prisma.reconciliationRun.create({
      data: {
        status: critical > 0 ? 'ISSUES_FOUND' : 'CLEAN',
        issuesFound: issues.length,
        summary,
        createdById: createdById ?? null,
      },
    })

    return {
      id: run.id,
      status: run.status,
      issuesFound: run.issuesFound,
      createdAt: run.createdAt.toISOString(),
      summary,
    }
  },

  async latest() {
    const run = await prisma.reconciliationRun.findFirst({
      orderBy: { createdAt: 'desc' },
    })
    if (!run) return null
    return {
      id: run.id,
      status: run.status,
      issuesFound: run.issuesFound,
      createdAt: run.createdAt.toISOString(),
      summary: run.summary,
    }
  },

  /**
   * Recompute wallet.balance / available / locked from ledger lines for a single wallet.
   * Does not invent money — only synchronizes denormalized wallet columns to ledger truth.
   */
  async syncWalletFromLedger(walletId: string) {
    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } })
    if (!wallet) {
      return { ok: false as const, reason: 'not_found' }
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: { walletId },
      select: { signedAmount: true, entryType: true, direction: true },
    })

    // Prefer the latest balanceAfter on available-side movements when present;
    // fall back to sum of signed amounts as balance.
    const last = await prisma.ledgerEntry.findFirst({
      where: { walletId, balanceAfter: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    })

    const sum = entries.reduce((acc, e) => acc.plus(d(e.signedAmount)), d(0))
    const balance = last?.balanceAfter != null ? d(last.balanceAfter) : sum

    // Locked balance: sum of lock entries minus unlock/complete — approximate via wallet field
    // We keep lockedBalance as stored and only sync balance/available when available = balance - locked.
    const locked = d(wallet.lockedBalance)
    const available = balance.minus(locked)
    if (available.lt(0)) {
      return {
        ok: false as const,
        reason: 'negative_available',
        balance: moneyString(balance),
        locked: moneyString(locked),
      }
    }

    await prisma.wallet.update({
      where: { id: walletId },
      data: {
        balance: moneyString(balance),
        availableBalance: moneyString(available),
      },
    })

    return {
      ok: true as const,
      walletId,
      balance: moneyString(balance),
      availableBalance: moneyString(available),
      lockedBalance: moneyString(locked),
      previousBalance: moneyString(wallet.balance),
    }
  },
}
