/**
 * In-process stability state — crash counters, latency, restart markers.
 * Powers System Health + owner alerts without an external store.
 */

export type CrashRecord = {
  id: string
  at: string
  kind: 'uncaughtException' | 'unhandledRejection' | 'fatal' | 'job' | 'request' | 'database'
  message: string
  stack?: string
  service: string
}

const startedAt = Date.now()
const crashes: CrashRecord[] = []
let restartCount = 0
let errorCount = 0
let dbDisconnectCount = 0
let lastDbStatus: 'up' | 'down' = 'up'
let lastDbUpAt = Date.now()
let dbDownSince: number | null = null

/** Rolling latency samples (ms) for average response time. */
const latencySamples: number[] = []
const LATENCY_MAX = 500

let seq = 0

export const processStability = {
  boot() {
    // Persist soft restart counter across graceful reloads in same process only.
    restartCount += 1
  },

  startedAt,

  recordCrash(input: Omit<CrashRecord, 'id' | 'at'>): CrashRecord {
    const entry: CrashRecord = {
      id: `crash_${Date.now()}_${++seq}`,
      at: new Date().toISOString(),
      ...input,
    }
    crashes.unshift(entry)
    if (crashes.length > 50) crashes.length = 50
    errorCount += 1
    return entry
  },

  recordRequestLatency(ms: number) {
    latencySamples.push(ms)
    if (latencySamples.length > LATENCY_MAX) latencySamples.shift()
  },

  averageResponseMs(): number | null {
    if (latencySamples.length === 0) return null
    const sum = latencySamples.reduce((a, b) => a + b, 0)
    return Math.round((sum / latencySamples.length) * 10) / 10
  },

  markDbUp() {
    if (lastDbStatus === 'down') {
      lastDbUpAt = Date.now()
    }
    lastDbStatus = 'up'
    dbDownSince = null
  },

  markDbDown() {
    if (lastDbStatus !== 'down') {
      dbDisconnectCount += 1
      dbDownSince = Date.now()
    }
    lastDbStatus = 'down'
  },

  snapshot() {
    const mem = process.memoryUsage()
    return {
      uptimeSeconds: Math.floor(process.uptime()),
      restartCount,
      errorCount,
      dbDisconnectCount,
      dbStatus: lastDbStatus,
      databaseUptimeSeconds:
        lastDbStatus === 'up'
          ? Math.floor((Date.now() - lastDbUpAt) / 1000)
          : 0,
      dbDownForSeconds: dbDownSince ? Math.floor((Date.now() - dbDownSince) / 1000) : 0,
      averageResponseMs: this.averageResponseMs(),
      recentCrashes: crashes.slice(0, 20),
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
      rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      gitCommit:
        process.env.RENDER_GIT_COMMIT ||
        process.env.GIT_COMMIT ||
        process.env.COMMIT_SHA ||
        'unknown',
      buildVersion:
        process.env.BUILD_VERSION ||
        process.env.npm_package_version ||
        '0.1.0',
      renderInstance:
        process.env.RENDER_INSTANCE_ID ||
        process.env.RENDER_SERVICE_ID ||
        process.env.HOSTNAME ||
        'local',
      lastDeployment:
        process.env.RENDER_GIT_COMMIT_TIMESTAMP ||
        process.env.DEPLOYED_AT ||
        new Date(startedAt).toISOString(),
      lastCrash: crashes[0]
        ? { at: crashes[0].at, kind: crashes[0].kind, message: crashes[0].message }
        : null,
    }
  },
}
