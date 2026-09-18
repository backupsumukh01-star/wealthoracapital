import { access, mkdir, statfs } from 'node:fs/promises'
import { constants } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { env } from '../config/env.js'
import { prisma } from '../database/prisma.js'
import { processStability } from '../observability/process-stability.js'
import { recordSystemLog } from '../observability/log-buffer.js'
import { logger } from '../utils/logger.js'
import { opsAlertService } from './ops-alert.service.js'

/** Debounce map so we don't spam owner inbox on flapping metrics. */
const lastAlertAt = new Map<string, number>()
const ALERT_COOLDOWN_MS = 15 * 60_000

async function alertOnce(
  key: string,
  payload: {
    title: string
    action: string
    reason?: string
    details?: Record<string, string | number | null | undefined>
  },
) {
  const now = Date.now()
  const prev = lastAlertAt.get(key) ?? 0
  if (now - prev < ALERT_COOLDOWN_MS) return
  lastAlertAt.set(key, now)

  const snap = processStability.snapshot()
  await opsAlertService.notify({
    event: 'SYSTEM_ERROR',
    title: payload.title,
    action: payload.action,
    reason: payload.reason,
    adminPath: '/admin/system-health',
    details: {
      Server: snap.renderInstance,
      Time: new Date().toISOString(),
      Service: 'growzy-api',
      'Git commit': snap.gitCommit,
      ...payload.details,
    },
  })
}

async function diskUsagePct(root: string): Promise<number | null> {
  try {
    const s = await statfs(root)
    if (!s.blocks || !s.bavail) return null
    return Math.round((1 - Number(s.bavail) / Number(s.blocks)) * 1000) / 10
  } catch {
    return null
  }
}

/**
 * Periodic production watchdog — CPU / disk / DB / email queue.
 * Memory is recorded for System Health only; it does not send ops mail.
 * Never throws to the scheduler.
 */
export const stabilityMonitorService = {
  async tick(): Promise<void> {
    try {
      // Database probe + reconnect
      try {
        await prisma.$queryRaw`SELECT 1`
        processStability.markDbUp()
      } catch (err) {
        processStability.markDbDown()
        processStability.recordCrash({
          kind: 'database',
          message: err instanceof Error ? err.message : 'Database probe failed',
          stack: err instanceof Error ? err.stack : undefined,
          service: 'growzy-api',
        })
        try {
          await prisma.$connect()
        } catch (reconnectErr) {
          logger.error({ err: reconnectErr }, 'Database reconnect failed')
        }
        await alertOnce('db-down', {
          title: 'Database disconnect',
          action: 'API lost connectivity to Postgres',
          reason: err instanceof Error ? err.message : String(err),
          details: {
            'Suggested cause': 'Pool exhaustion, network blip, or Postgres restart',
            'Stack trace': err instanceof Error ? (err.stack ?? '').slice(0, 1500) : '—',
          },
        })
      }

      const mem = process.memoryUsage()
      const total = os.totalmem()
      const free = os.freemem()
      const systemUsedPct = ((total - free) / total) * 100
      const heapPct = (mem.heapUsed / mem.heapTotal) * 100

      const load1 = os.loadavg()[0] ?? 0
      const cores = Math.max(1, os.cpus().length)
      const cpuPct = (load1 / cores) * 100
      if (cpuPct >= 90) {
        await alertOnce('cpu-high', {
          title: 'CPU exceeds threshold',
          action: `Load1 ${load1.toFixed(2)} across ${cores} cores (~${cpuPct.toFixed(0)}%)`,
          details: {
            'Suggested cause': 'Blocking work, heavy query, or tight cron overlap',
          },
        })
      }

      const uploadRoot = path.resolve(env.UPLOAD_ROOT)
      const diskRoot = uploadRoot.startsWith('/data') ? '/data' : uploadRoot
      const diskPct = await diskUsagePct(diskRoot)
      if (diskPct != null && diskPct >= 80) {
        await alertOnce('disk-high', {
          title: 'Disk usage exceeds 80%',
          action: `${diskRoot} at ${diskPct}%`,
          details: {
            'Suggested cause': 'Upload accumulation or log growth on persistent disk',
          },
        })
      }

      // Email outbox failure streak
      try {
        const failed = await prisma.emailOutbox.count({
          where: { status: 'FAILED', updatedAt: { gte: new Date(Date.now() - 60 * 60_000) } },
        })
        if (failed >= 5) {
          await alertOnce('email-fail', {
            title: 'Email delivery repeatedly failing',
            action: `${failed} failed outbox rows in the last hour`,
            details: { 'Suggested cause': 'Resend/API key, domain verification, or rate limits' },
          })
        }
      } catch {
        // ignore if model unavailable
      }

      // Upload root writability = storage health
      try {
        await mkdir(uploadRoot, { recursive: true })
        await access(uploadRoot, constants.R_OK | constants.W_OK)
      } catch (err) {
        await alertOnce('storage-error', {
          title: 'Storage error',
          action: `Upload root not writable: ${uploadRoot}`,
          reason: err instanceof Error ? err.message : String(err),
          details: { 'Suggested cause': 'Missing Render disk mount or permissions' },
        })
      }

      recordSystemLog({
        level: 'debug',
        message: 'Stability monitor tick',
        meta: {
          systemUsedPct: Math.round(systemUsedPct),
          heapPct: Math.round(heapPct),
          rssMb: Math.round(mem.rss / 1024 / 1024),
          cpuPct: Math.round(cpuPct),
          diskPct,
        },
      })
    } catch (err) {
      logger.warn({ err }, 'Stability monitor tick failed')
    }
  },

  async notifyUnhandled(kind: 'uncaughtException' | 'unhandledRejection', err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    processStability.recordCrash({
      kind,
      message,
      stack,
      service: 'growzy-api',
    })
    recordSystemLog({
      level: 'fatal',
      message: `${kind}: ${message}`,
      meta: { stack: stack?.slice(0, 2000) },
    })
    await alertOnce(`process-${kind}`, {
      title: kind === 'uncaughtException' ? 'API uncaught exception' : 'Unhandled promise rejection',
      action: message,
      reason: message,
      details: {
        'Stack trace': (stack ?? '—').slice(0, 2000),
        'Suggested cause':
          kind === 'uncaughtException'
            ? 'Bug outside Express error boundary — review stack'
            : 'Forgotten await/catch in async background work',
      },
    })
  },
}
