import { describe, expect, it } from 'vitest'

import { CircuitBreaker } from '../../src/utils/circuit-breaker.js'
import { isPermanentError, isTransientError, withRetry } from '../../src/utils/retry.js'
import { processStability } from '../../src/observability/process-stability.js'
import { scheduler } from '../../src/jobs/scheduler.js'

describe('Production stability primitives', () => {
  it('classifies transient vs permanent errors', () => {
    expect(isTransientError({ code: 'P1001' })).toBe(true)
    expect(isTransientError({ code: 'ETIMEDOUT' })).toBe(true)
    expect(isPermanentError({ statusCode: 400 })).toBe(true)
    expect(isPermanentError({ code: 'P2002' })).toBe(true)
  })

  it('retries transient failures then succeeds', async () => {
    let n = 0
    const result = await withRetry(
      async () => {
        n += 1
        if (n < 3) throw Object.assign(new Error('conn reset'), { code: 'ECONNRESET' })
        return 'ok'
      },
      { retries: 5, minDelayMs: 1, maxDelayMs: 5 },
    )
    expect(result).toBe('ok')
    expect(n).toBe(3)
  })

  it('does not retry permanent failures', async () => {
    let n = 0
    await expect(
      withRetry(
        async () => {
          n += 1
          throw Object.assign(new Error('unique'), { code: 'P2002' })
        },
        { retries: 3, minDelayMs: 1 },
      ),
    ).rejects.toBeTruthy()
    expect(n).toBe(1)
  })

  it('opens circuit after repeated failures', async () => {
    const c = new CircuitBreaker('test', 2, 60_000)
    await expect(c.exec(async () => { throw new Error('fail') })).rejects.toThrow('fail')
    await expect(c.exec(async () => { throw new Error('fail') })).rejects.toThrow('fail')
    await expect(c.exec(async () => 'x')).rejects.toThrow(/Circuit open/)
    expect(c.getStatus().state).toBe('open')
  })

  it('records crashes and latency in processStability', () => {
    processStability.recordRequestLatency(120)
    processStability.recordCrash({
      kind: 'request',
      message: 'test crash',
      service: 'growzy-api',
    })
    const snap = processStability.snapshot()
    expect(snap.errorCount).toBeGreaterThan(0)
    expect(snap.recentCrashes[0]?.message).toBe('test crash')
    expect(snap.averageResponseMs).toBeTypeOf('number')
  })

  it('isolates scheduled job failures without throwing', async () => {
    let ran = 0
    scheduler.register('stability-test-job', 60_000, async () => {
      ran += 1
      throw new Error('boom')
    })
    await expect(scheduler.runNow('stability-test-job')).resolves.toBeUndefined()
    expect(ran).toBe(1)
    const listed = scheduler.list().find((j) => j.name === 'stability-test-job')
    expect(listed?.consecutiveFailures).toBe(1)
    scheduler.unregister('stability-test-job')
  })
})
