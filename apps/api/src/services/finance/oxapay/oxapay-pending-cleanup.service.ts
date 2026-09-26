import { prisma } from '../../../database/prisma.js'
import { logger } from '../../../utils/logger.js'
import { depositService } from '../deposit.service.js'
import { oxapayCleanupDueWhere } from './oxapay-visibility.js'

/**
 * Server-authoritative cleanup for abandoned OxaPay pending deposits.
 * After invoice expiry + 30m grace: reverse pending ledger, mark REJECTED (existing
 * provider-failed semantics). Never credits wallet. Idempotent.
 */
export const oxapayPendingCleanupService = {
  async run(limit = 100): Promise<{ scanned: number; cleaned: number; failed: number }> {
    const due = await prisma.deposit.findMany({
      where: oxapayCleanupDueWhere(),
      select: { id: true, reference: true, userId: true, status: true },
      orderBy: { createdAt: 'asc' },
      take: Math.min(Math.max(limit, 1), 500),
    })

    let cleaned = 0
    let failed = 0
    for (const row of due) {
      try {
        await depositService.markFailedFromProvider(row.id, {
          eventId: `oxapay:cleanup:${row.id}`,
          reason: 'OxaPay payment expired — unpaid after invoice lifetime + grace period',
          context: {},
        })
        cleaned += 1
      } catch (error) {
        failed += 1
        logger.warn(
          {
            depositId: row.id,
            reference: row.reference,
            status: row.status,
            err: error instanceof Error ? error.message : 'cleanup_failed',
          },
          'OxaPay pending cleanup skipped deposit',
        )
      }
    }

    if (due.length > 0) {
      logger.info(
        { scanned: due.length, cleaned, failed },
        'OxaPay pending deposit cleanup completed',
      )
    }

    return { scanned: due.length, cleaned, failed }
  },
}
