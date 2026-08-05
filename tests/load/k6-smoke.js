/**
 * k6 load scenarios for Growzy API.
 *
 * Install k6 separately: https://k6.io/docs/get-started/installation/
 *
 *   k6 run tests/load/k6-smoke.js
 *   k6 run -e VUS=500 -e DURATION=2m tests/load/k6-concurrent.js
 */
import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE = __ENV.BASE_URL || 'http://localhost:4000'

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '30s',
      exec: 'smoke',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
}

export function smoke() {
  const health = http.get(`${BASE}/api/health`)
  check(health, { 'health ok': (r) => r.status === 200 || r.status === 503 })

  const cms = http.get(`${BASE}/api/v1/cms/public`)
  check(cms, { 'cms public': (r) => r.status === 200 })

  const trades = http.get(`${BASE}/api/v1/trades/public`)
  check(trades, { 'trades public': (r) => r.status === 200 })

  sleep(0.5)
}
