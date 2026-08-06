import { access, mkdir } from 'node:fs/promises'
import { constants } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'

import { APP_VERSION } from '../config/constants.js'
import { env } from '../config/env.js'
import { prisma } from '../database/prisma.js'
import { getQueueCounts } from '../jobs/bullmq.js'
import { scheduler } from '../jobs/scheduler.js'
import { getErrorLogs, getSystemLogs, recordSystemLog } from '../observability/log-buffer.js'
import { processStability } from '../observability/process-stability.js'
import { getRedis, pingRedis } from './redis/client.js'

export type HealthTone = 'healthy' | 'warning' | 'critical'

export type HealthMetric = {
  id: string
  label: string
  value: string
  detail: string
  tone: HealthTone
  group: 'infra' | 'services' | 'ops' | 'security'
}

export type AdminHealthSnapshot = {
  refreshedAt: string
  version: string
  environment: 'staging' | 'production' | 'development' | 'test'
  uptimeSeconds: number
  metrics: HealthMetric[]
  widgets: {
    api: { status: string; uptimeSeconds: number; node: string }
    database: { status: 'up' | 'down'; latencyMs: number | null }
    redis: { status: 'up' | 'down' | 'disabled'; latencyMs: number | null }
    queue: {
      driver: string
      waiting: number
      active: number
      failed: number
      byGroup: Record<string, { waiting: number; active: number; failed: number }>
    }
    storage: { status: 'up' | 'down' | 'disabled'; driver: string; detail: string }
    emailQueue: { queued: number; sending: number; failed: number; sentToday: number }
    failedJobs: { count: number; detail: string }
    cpu: { load1: number; load5: number; cores: number; processUserMs: number }
    memory: {
      processRssMb: number
      processHeapUsedMb: number
      systemUsedPct: number
      systemFreeMb: number
      systemTotalMb: number
    }
    visitors: { last24h: number; today: number }
    activeUsers: { sessions: number; users: number }
    depositsToday: { count: number; amount: string }
    withdrawalsToday: { count: number; amount: string }
    kycPending: { count: number }
    failedPayments: { depositsRejected: number; withdrawalsRejected: number; total: number }
    stability: {
      averageResponseMs: number | null
      errorCount: number
      restartCount: number
      dbDisconnectCount: number
      databaseUptimeSeconds: number
      apiUptimeSeconds: number
      gitCommit: string
      renderInstance: string
      lastDeployment: string
      diskUsedPct: number | null
      recentCrashes: Array<{ id: string; at: string; kind: string; message: string }>
      backgroundJobs: Array<{ name: string; intervalMs: number; consecutiveFailures: number }>
    }
  }
  logs: {
    system: Array<{ id: string; at: string; level: string; message: string }>
    audit: Array<{ id: string; at: string; action: string; module: string; actorId: string | null }>
    errors: Array<{ id: string; at: string; level: string; message: string }>
  }
}

function toneUp(ok: boolean, warn = false): HealthTone {
  if (!ok) return 'critical'
  if (warn) return 'warning'
  return 'healthy'
}

function startOfUtcDay(d = new Date()): Date {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

function mb(n: number): number {
  return Math.round((n / (1024 * 1024)) * 10) / 10
}

async function probeDatabase(): Promise<{ status: 'up' | 'down'; latencyMs: number | null }> {
  const t0 = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    processStability.markDbUp()
    return { status: 'up', latencyMs: Date.now() - t0 }
  } catch {
    processStability.markDbDown()
    return { status: 'down', latencyMs: null }
  }
}

async function probeDisk(): Promise<number | null> {
  try {
    const { statfs } = await import('node:fs/promises')
    const root = path.resolve(env.UPLOAD_ROOT).startsWith('/data')
      ? '/data'
      : path.resolve(env.UPLOAD_ROOT)
    const s = await statfs(root)
    if (!s.blocks) return null
    return Math.round((1 - Number(s.bavail) / Number(s.blocks)) * 1000) / 10
  } catch {
    return null
  }
}

async function probeRedis(): Promise<{
  status: 'up' | 'down' | 'disabled'
  latencyMs: number | null
}> {
  if (!env.REDIS_URL) return { status: 'disabled', latencyMs: null }
  const t0 = Date.now()
  const status = await pingRedis()
  if (status !== 'up') return { status, latencyMs: null }
  return { status: 'up', latencyMs: Date.now() - t0 }
}

async function probeStorage(): Promise<{
  status: 'up' | 'down' | 'disabled'
  driver: string
  detail: string
}> {
  const driver = env.STORAGE_DRIVER
  try {
    if (driver === 's3') {
      if (!env.S3_BUCKET) {
        return { status: 'disabled', driver, detail: 'S3_BUCKET not configured' }
      }
      const client = new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT || undefined,
        forcePathStyle: Boolean(env.S3_ENDPOINT),
        credentials:
          env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
            ? {
                accessKeyId: env.S3_ACCESS_KEY_ID,
                secretAccessKey: env.S3_SECRET_ACCESS_KEY,
              }
            : undefined,
      })
      await client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }))
      return { status: 'up', driver, detail: `bucket ${env.S3_BUCKET}` }
    }
    const root = path.resolve(env.UPLOAD_ROOT)
    await mkdir(root, { recursive: true }).catch(() => undefined)
    await access(root, constants.R_OK | constants.W_OK)
    const onPersistentDisk = root.startsWith('/data')
    return {
      status: 'up' as const,
      driver: 'local',
      detail: onPersistentDisk
        ? `${root} (persistent disk mount)`
        : `${root} (WARNING: not under /data — uploads may be ephemeral)`,
    }
  } catch (error) {
    return {
      status: 'down',
      driver,
      detail: error instanceof Error ? error.message : 'storage probe failed',
    }
  }
}

async function queueSnapshot(): Promise<AdminHealthSnapshot['widgets']['queue']> {
  const driver = env.JOB_DRIVER
  if (driver === 'bullmq' && env.REDIS_URL) {
    try {
      const byGroup = await getQueueCounts()
      const waiting = Object.values(byGroup).reduce((s, c) => s + c.waiting, 0)
      const active = Object.values(byGroup).reduce((s, c) => s + c.active, 0)
      const failed = Object.values(byGroup).reduce((s, c) => s + c.failed, 0)
      return { driver, waiting, active, failed, byGroup }
    } catch {
      return { driver, waiting: 0, active: 0, failed: 0, byGroup: {} }
    }
  }
  try {
    const { getLocalHandlers } = await import('../jobs/index.js')
    const failed = getLocalHandlers().getFailedCount()
    return {
      driver,
      waiting: 0,
      active: 0,
      failed,
      byGroup: { memory: { waiting: 0, active: 0, failed } },
    }
  } catch {
    return { driver, waiting: 0, active: 0, failed: 0, byGroup: {} }
  }
}

export const adminHealthService = {
  async snapshot(): Promise<AdminHealthSnapshot> {
    const refreshedAt = new Date().toISOString()
    const dayStart = startOfUtcDay()
    const dayEnd = new Date(dayStart)
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [database, redis, storage, queue, diskUsedPct] = await Promise.all([
      probeDatabase(),
      probeRedis(),
      probeStorage(),
      queueSnapshot(),
      probeDisk(),
    ])

    const [
      emailQueued,
      emailSending,
      emailFailed,
      emailSentToday,
      depositsTodayCount,
      depositsTodayAgg,
      withdrawalsTodayCount,
      withdrawalsTodayAgg,
      kycPending,
      depositsRejected,
      withdrawalsRejected,
      activeSessions,
      activeSessionUsers,
      visitors24h,
      visitorsToday,
      auditRows,
    ] = await Promise.all([
      prisma.emailOutbox.count({ where: { status: 'QUEUED' } }),
      prisma.emailOutbox.count({ where: { status: 'SENDING' } }),
      prisma.emailOutbox.count({ where: { status: 'FAILED' } }),
      prisma.emailOutbox.count({
        where: { status: 'SENT', sentAt: { gte: dayStart, lt: dayEnd } },
      }),
      prisma.deposit.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
      prisma.deposit.aggregate({
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
        _sum: { amount: true },
      }),
      prisma.withdrawal.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
      prisma.withdrawal.aggregate({
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
        _sum: { amount: true },
      }),
      prisma.kycSubmission.count({
        where: { status: { in: ['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO'] } },
      }),
      prisma.deposit.count({
        where: { status: 'REJECTED', createdAt: { gte: dayStart, lt: dayEnd } },
      }),
      prisma.withdrawal.count({
        where: { status: 'REJECTED', createdAt: { gte: dayStart, lt: dayEnd } },
      }),
      prisma.session.count({
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
      }),
      prisma.session.findMany({
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.activityLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: last24h } },
      }),
      prisma.activityLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          action: true,
          module: true,
          actorId: true,
          createdAt: true,
        },
      }),
    ])

    // Touch Redis briefly so INFO is available when up (optional detail).
    if (redis.status === 'up') {
      try {
        await getRedis()?.info('memory')
      } catch {
        // ignore
      }
    }

    const mem = process.memoryUsage()
    const cpu = process.cpuUsage()
    const load = os.loadavg()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedPct = Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10

    const depositsAmount = (depositsTodayAgg._sum.amount ?? 0).toString()
    const withdrawalsAmount = (withdrawalsTodayAgg._sum.amount ?? 0).toString()
    const failedPaymentsTotal = depositsRejected + withdrawalsRejected

    const envLabel =
      env.APP_ENV === 'production' || env.NODE_ENV === 'production'
        ? 'production'
        : env.APP_ENV === 'staging'
          ? 'staging'
          : env.NODE_ENV === 'test'
            ? 'test'
            : 'development'

    const widgets: AdminHealthSnapshot['widgets'] = {
      api: {
        status: database.status === 'up' ? 'ok' : 'degraded',
        uptimeSeconds: Math.floor(process.uptime()),
        node: process.version,
      },
      database,
      redis,
      queue,
      storage,
      emailQueue: {
        queued: emailQueued,
        sending: emailSending,
        failed: emailFailed,
        sentToday: emailSentToday,
      },
      failedJobs: {
        count: queue.failed,
        detail:
          queue.driver === 'bullmq'
            ? `${queue.failed} failed across BullMQ groups`
            : `${queue.failed} failed in-process (memory driver)`,
      },
      cpu: {
        load1: Math.round(load[0]! * 100) / 100,
        load5: Math.round(load[1]! * 100) / 100,
        cores: os.cpus().length,
        processUserMs: Math.round(cpu.user / 1000),
      },
      memory: {
        processRssMb: mb(mem.rss),
        processHeapUsedMb: mb(mem.heapUsed),
        systemUsedPct: usedPct,
        systemFreeMb: mb(freeMem),
        systemTotalMb: mb(totalMem),
      },
      visitors: { last24h: visitors24h.length, today: visitorsToday.length },
      activeUsers: { sessions: activeSessions, users: activeSessionUsers.length },
      depositsToday: { count: depositsTodayCount, amount: depositsAmount },
      withdrawalsToday: { count: withdrawalsTodayCount, amount: withdrawalsAmount },
      kycPending: { count: kycPending },
      failedPayments: {
        depositsRejected,
        withdrawalsRejected,
        total: failedPaymentsTotal,
      },
      stability: (() => {
        const s = processStability.snapshot()
        return {
          averageResponseMs: s.averageResponseMs,
          errorCount: s.errorCount,
          restartCount: s.restartCount,
          dbDisconnectCount: s.dbDisconnectCount,
          databaseUptimeSeconds: s.databaseUptimeSeconds,
          apiUptimeSeconds: s.uptimeSeconds,
          gitCommit: s.gitCommit,
          renderInstance: s.renderInstance,
          lastDeployment: s.lastDeployment,
          diskUsedPct,
          recentCrashes: s.recentCrashes.map((c) => ({
            id: c.id,
            at: c.at,
            kind: c.kind,
            message: c.message,
          })),
          backgroundJobs: scheduler.list(),
        }
      })(),
    }

    const systemLogCount = getSystemLogs().length
    const errorLogCount = getErrorLogs().length

    const metrics: HealthMetric[] = [
      {
        id: 'api',
        label: 'API status',
        value: widgets.api.status.toUpperCase(),
        detail: `uptime ${widgets.api.uptimeSeconds}s · ${widgets.api.node}`,
        tone: toneUp(widgets.api.status === 'ok'),
        group: 'infra',
      },
      {
        id: 'database',
        label: 'Database',
        value: database.status.toUpperCase(),
        detail:
          database.latencyMs != null ? `latency ${database.latencyMs}ms` : 'probe failed',
        tone: toneUp(database.status === 'up', (database.latencyMs ?? 0) > 200),
        group: 'infra',
      },
      {
        id: 'redis',
        label: 'Redis',
        value: redis.status.toUpperCase(),
        detail:
          redis.status === 'disabled'
            ? 'REDIS_URL not set'
            : redis.latencyMs != null
              ? `latency ${redis.latencyMs}ms`
              : 'unreachable',
        tone:
          redis.status === 'disabled'
            ? 'warning'
            : toneUp(redis.status === 'up', (redis.latencyMs ?? 0) > 100),
        group: 'infra',
      },
      {
        id: 'queue',
        label: 'Queue',
        value: `${queue.waiting} waiting`,
        detail: `${queue.driver} · ${queue.active} active · ${queue.failed} failed`,
        tone: toneUp(true, queue.failed > 0 || queue.waiting > 100),
        group: 'services',
      },
      {
        id: 'storage',
        label: 'Storage',
        value: storage.status.toUpperCase(),
        detail: `${storage.driver} · ${storage.detail}`,
        tone:
          storage.status === 'disabled'
            ? 'warning'
            : toneUp(storage.status === 'up'),
        group: 'infra',
      },
      {
        id: 'email-queue',
        label: 'Email Queue',
        value: String(emailQueued),
        detail: `${emailSending} sending · ${emailFailed} failed · ${emailSentToday} sent today`,
        tone: toneUp(emailFailed === 0, emailQueued > 50 || emailFailed > 0),
        group: 'services',
      },
      {
        id: 'failed-jobs',
        label: 'Failed Jobs',
        value: String(queue.failed),
        detail: widgets.failedJobs.detail,
        tone: toneUp(queue.failed === 0, queue.failed > 0),
        group: 'services',
      },
      {
        id: 'cpu',
        label: 'CPU',
        value: `${widgets.cpu.load1}`,
        detail: `load1/5 ${widgets.cpu.load1}/${widgets.cpu.load5} · ${widgets.cpu.cores} cores`,
        tone: toneUp(widgets.cpu.load1 < widgets.cpu.cores * 0.85, widgets.cpu.load1 > widgets.cpu.cores * 0.7),
        group: 'infra',
      },
      {
        id: 'memory',
        label: 'Memory',
        value: `${widgets.memory.processRssMb} MB`,
        detail: `heap ${widgets.memory.processHeapUsedMb} MB · system ${widgets.memory.systemUsedPct}% used`,
        tone: toneUp(widgets.memory.systemUsedPct < 90, widgets.memory.systemUsedPct > 80),
        group: 'infra',
      },
      {
        id: 'visitors',
        label: 'Visitors',
        value: String(widgets.visitors.last24h),
        detail: `${widgets.visitors.today} active today (unique users with activity)`,
        tone: 'healthy',
        group: 'ops',
      },
      {
        id: 'active-users',
        label: 'Active Users',
        value: String(widgets.activeUsers.users),
        detail: `${widgets.activeUsers.sessions} live sessions`,
        tone: 'healthy',
        group: 'ops',
      },
      {
        id: 'deposits-today',
        label: 'Deposits Today',
        value: String(widgets.depositsToday.count),
        detail: `sum ${widgets.depositsToday.amount} (UTC day)`,
        tone: 'healthy',
        group: 'ops',
      },
      {
        id: 'withdrawals-today',
        label: 'Withdrawals Today',
        value: String(widgets.withdrawalsToday.count),
        detail: `sum ${widgets.withdrawalsToday.amount} (UTC day)`,
        tone: 'healthy',
        group: 'ops',
      },
      {
        id: 'kyc-pending',
        label: 'KYC Pending',
        value: String(widgets.kycPending.count),
        detail: 'PENDING / SUBMITTED / UNDER_REVIEW / NEED_MORE_INFO',
        tone: toneUp(true, widgets.kycPending.count > 20),
        group: 'ops',
      },
      {
        id: 'failed-payments',
        label: 'Failed Payments',
        value: String(widgets.failedPayments.total),
        detail: `${depositsRejected} deposits · ${withdrawalsRejected} withdrawals rejected today`,
        tone: toneUp(failedPaymentsTotal === 0, failedPaymentsTotal > 0),
        group: 'ops',
      },
      {
        id: 'system-logs',
        label: 'System Logs',
        value: String(systemLogCount),
        detail: 'In-process ring buffer (recent API events)',
        tone: 'healthy',
        group: 'security',
      },
      {
        id: 'audit-logs',
        label: 'Audit Logs',
        value: String(auditRows.length),
        detail: 'Latest audit entries from database',
        tone: 'healthy',
        group: 'security',
      },
      {
        id: 'error-logs',
        label: 'Error Logs',
        value: String(errorLogCount),
        detail: 'Buffered 5xx / unhandled errors',
        tone: toneUp(errorLogCount === 0, errorLogCount > 0),
        group: 'security',
      },
      {
        id: 'api-uptime',
        label: 'API uptime',
        value: `${Math.floor(widgets.stability.apiUptimeSeconds / 3600)}h`,
        detail: `${widgets.stability.apiUptimeSeconds}s · restarts ${widgets.stability.restartCount}`,
        tone: 'healthy',
        group: 'infra',
      },
      {
        id: 'db-uptime',
        label: 'Database uptime',
        value:
          database.status === 'up'
            ? `${Math.floor(widgets.stability.databaseUptimeSeconds / 3600)}h`
            : 'DOWN',
        detail: `disconnects ${widgets.stability.dbDisconnectCount}`,
        tone: toneUp(database.status === 'up'),
        group: 'infra',
      },
      {
        id: 'avg-latency',
        label: 'Avg response time',
        value:
          widgets.stability.averageResponseMs != null
            ? `${widgets.stability.averageResponseMs} ms`
            : '—',
        detail: 'Rolling in-process sample',
        tone: toneUp(
          true,
          (widgets.stability.averageResponseMs ?? 0) > 500,
        ),
        group: 'infra',
      },
      {
        id: 'disk',
        label: 'Disk usage',
        value:
          widgets.stability.diskUsedPct != null
            ? `${widgets.stability.diskUsedPct}%`
            : 'n/a',
        detail: env.UPLOAD_ROOT,
        tone: toneUp(
          (widgets.stability.diskUsedPct ?? 0) < 90,
          (widgets.stability.diskUsedPct ?? 0) >= 80,
        ),
        group: 'infra',
      },
      {
        id: 'crashes',
        label: 'Recent crashes',
        value: String(widgets.stability.recentCrashes.length),
        detail: `Errors recorded ${widgets.stability.errorCount}`,
        tone: toneUp(widgets.stability.recentCrashes.length === 0, widgets.stability.recentCrashes.length > 0),
        group: 'security',
      },
      {
        id: 'git-commit',
        label: 'Git commit',
        value: widgets.stability.gitCommit.slice(0, 8),
        detail: `instance ${widgets.stability.renderInstance}`,
        tone: 'healthy',
        group: 'infra',
      },
      {
        id: 'last-deploy',
        label: 'Last deployment',
        value: widgets.stability.lastDeployment.slice(0, 19).replace('T', ' '),
        detail: 'Render / process boot marker',
        tone: 'healthy',
        group: 'infra',
      },
      {
        id: 'bg-jobs',
        label: 'Background jobs',
        value: String(widgets.stability.backgroundJobs.length),
        detail: widgets.stability.backgroundJobs
          .map((j) => `${j.name}${j.consecutiveFailures ? `(!${j.consecutiveFailures})` : ''}`)
          .slice(0, 4)
          .join(', ') || 'none scheduled',
        tone: toneUp(
          widgets.stability.backgroundJobs.every((j) => j.consecutiveFailures === 0),
          widgets.stability.backgroundJobs.some((j) => j.consecutiveFailures > 0),
        ),
        group: 'services',
      },
    ]

    recordSystemLog({
      level: 'info',
      message: 'Admin health snapshot refreshed',
      meta: { database: database.status, redis: redis.status, storage: storage.status },
    })

    return {
      refreshedAt,
      version: `Growzy API ${APP_VERSION}`,
      environment: envLabel,
      uptimeSeconds: Math.floor(process.uptime()),
      metrics,
      widgets,
      logs: {
        system: getSystemLogs(40).map((l) => ({
          id: l.id,
          at: l.at,
          level: l.level,
          message: l.message,
        })),
        audit: auditRows.map((r) => ({
          id: r.id,
          at: r.createdAt.toISOString(),
          action: r.action,
          module: r.module,
          actorId: r.actorId,
        })),
        errors: getErrorLogs(40).map((l) => ({
          id: l.id,
          at: l.at,
          level: l.level,
          message: l.message,
        })),
      },
    }
  },
}
