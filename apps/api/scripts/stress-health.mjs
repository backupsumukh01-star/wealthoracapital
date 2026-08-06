/**
 * Concurrent health/version stress probe for Growzy API.
 *
 * Usage:
 *   node apps/api/scripts/stress-health.mjs [baseUrl] [concurrency]
 *
 * Defaults: http://127.0.0.1:4000  and runs 100 → 500 → 1000 waves.
 */
import { performance } from 'node:perf_hooks'

const base = (process.argv[2] || process.env.API_URL || 'http://127.0.0.1:4000').replace(/\/$/, '')
const only = process.argv[3] ? Number(process.argv[3]) : null

async function wave(concurrency) {
  const url = `${base}/api/health/live`
  const started = performance.now()
  let ok = 0
  let fail = 0
  const errors = new Map()

  const tasks = Array.from({ length: concurrency }, async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) ok += 1
      else {
        fail += 1
        errors.set(String(res.status), (errors.get(String(res.status)) || 0) + 1)
      }
    } catch (err) {
      fail += 1
      const key = err instanceof Error ? err.message : 'error'
      errors.set(key, (errors.get(key) || 0) + 1)
    }
  })

  await Promise.all(tasks)
  const ms = Math.round(performance.now() - started)
  return { concurrency, ok, fail, ms, errors: Object.fromEntries(errors) }
}

const sizes = only ? [only] : [100, 500, 1000]
const results = []

console.log(`Stress target: ${base}`)
for (const n of sizes) {
  const r = await wave(n)
  results.push(r)
  console.log(
    `concurrency=${r.concurrency} ok=${r.ok} fail=${r.fail} durationMs=${r.ms}`,
    Object.keys(r.errors).length ? r.errors : '',
  )
}

const allPass = results.every((r) => r.fail === 0)
console.log(allPass ? 'STRESS_PASS' : 'STRESS_FAIL')
process.exit(allPass ? 0 : 1)
