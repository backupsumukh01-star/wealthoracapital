/**
 * Concurrent login / public read pressure.
 *   k6 run -e VUS=500 tests/load/k6-concurrent.js
 *   k6 run -e VUS=1000 tests/load/k6-concurrent.js
 *   k6 run -e VUS=5000 -e DURATION=1m tests/load/k6-concurrent.js
 */
import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE = __ENV.BASE_URL || 'http://localhost:4000'

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: Number(__ENV.VUS || 100) },
        { duration: __ENV.DURATION || '40s', target: Number(__ENV.VUS || 100) },
        { duration: '20s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<5000'],
  },
}

export default function () {
  const endpoints = [
    '/api/health',
    '/api/v1/cms/public',
    '/api/v1/settings/public',
    '/api/v1/trades/public',
    '/api/v1/performance/public',
  ]
  const path = endpoints[Math.floor(Math.random() * endpoints.length)]
  const res = http.get(`${BASE}${path}`)
  check(res, {
    'status < 500': (r) => r.status < 500,
  })
  sleep(0.2)
}
