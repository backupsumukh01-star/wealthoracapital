import { logger } from './logger.js'

type CircuitState = 'closed' | 'open' | 'half-open'

/**
 * Simple circuit breaker for external/transient dependencies (DB probes, Redis, ESP).
 * Open circuit fails fast; half-open allows a trial request after cooldown.
 */
export class CircuitBreaker {
  private failures = 0
  private state: CircuitState = 'closed'
  private openedAt = 0

  constructor(
    private readonly name: string,
    private readonly threshold = 5,
    private readonly cooldownMs = 30_000,
  ) {}

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt < this.cooldownMs) {
        throw new Error(`Circuit open: ${this.name}`)
      }
      this.state = 'half-open'
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure(err)
      throw err
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'closed'
  }

  private onFailure(err: unknown) {
    this.failures += 1
    if (this.failures >= this.threshold || this.state === 'half-open') {
      this.state = 'open'
      this.openedAt = Date.now()
      logger.warn({ name: this.name, failures: this.failures, err }, 'Circuit breaker opened')
    }
  }

  getStatus() {
    return { name: this.name, state: this.state, failures: this.failures }
  }
}

export const dbCircuit = new CircuitBreaker('database', 5, 20_000)
export const redisCircuit = new CircuitBreaker('redis', 5, 20_000)
