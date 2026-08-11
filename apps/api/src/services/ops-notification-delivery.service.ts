import { randomUUID } from 'node:crypto'

import { Prisma } from '@prisma/client'

import { prisma } from '../database/prisma.js'
import { logger } from '../utils/logger.js'

function isUniqueConflict(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return true
  }
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  )
}

/**
 * Claim a one-shot ops notification delivery key.
 * Returns true if this caller should send; false if already delivered (or race lost).
 *
 * Concurrency: uses PostgreSQL `ON CONFLICT DO NOTHING` so a lost race does not
 * raise (or log) a Prisma unique-constraint error. The unique index remains the
 * source of truth — this does not weaken idempotency.
 *
 * Separate from ledger/deposit financial idempotency. Callers must not let claim
 * failures roll back finance (ops alerts are post-commit side effects).
 */
export async function claimOpsNotificationDelivery(
  channel: string,
  eventKey: string,
): Promise<boolean> {
  const ch = channel.slice(0, 40)
  const key = eventKey.slice(0, 220)
  const id = randomUUID()

  try {
    // INSERT … ON CONFLICT avoids Prisma P2002 exception/log noise under concurrency.
    const inserted = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO ops_notification_deliveries (id, channel, event_key, created_at)
      VALUES (${id}::uuid, ${ch}, ${key}, NOW())
      ON CONFLICT (channel, event_key) DO NOTHING
      RETURNING id
    `
    return inserted.length > 0
  } catch (err) {
    // Belt-and-suspenders: if a unique conflict somehow still surfaces, treat as duplicate.
    if (isUniqueConflict(err)) {
      return false
    }
    logger.warn(
      { channel: ch, eventKey: key, err: err instanceof Error ? err.message : 'claim_failed' },
      'ops notification delivery claim failed',
    )
    // Fail open for unexpected infra errors so a DB blip does not silently drop alerts;
    // finance paths must not depend on this claim (side-effect only).
    return true
  }
}
