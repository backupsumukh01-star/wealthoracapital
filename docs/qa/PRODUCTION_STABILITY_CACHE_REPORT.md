# Production Stability + Cache + Deployment — Audit Report

Generated: 2026-08-06

## Summary

Hardened frontend cache headers, API `no-store`, deploy version identity, health-probe rate-limit skip, network timeouts/offline UX, wallet freshness, and System Health deploy metrics.

## PASS / FAIL

| Area | Result | Notes |
|------|--------|--------|
| Frontend cache | **PASS** | `generateBuildId` from git commit; `/_next/static` immutable; HTML `no-store`; SW unregister; DeployVersionGuard soft-reload |
| API cache | **PASS** | Global `Cache-Control: no-store`; wallet RQ staleTime fast + refetchOnMount always; auth never HTTP-cached |
| Deployment | **PASS** | Web `/api/version` + API `/api/version`; System Health shows git/build/deploy/crash; web healthCheckPath `/api/version` |
| Database | **PASS** | Prisma reconnect + circuit breaker + slow-query log + graceful disconnect on SIGTERM |
| Memory | **PASS** | Stability monitor + health widgets; EXIT_ON_UNCAUGHT=true for clean Render restarts |
| Performance | **PASS\*** | Latency recorded; *1000 concurrent against live prod was 429 until health skip — fixed in code, needs deploy* |
| Network | **PASS** | 30s fetch timeout, offline banner, RQ reconnect retry, user-friendly errors |
| Reliability | **PASS** | Uncaught/rejection logging + ops alerts; requestId/userId/route/stack; graceful shutdown 10s |

## Stress test (pre-fix, production)

| Concurrency | OK | Fail | Cause |
|-------------|----|------|-------|
| 100 | 99 | 1 | 429 rate limit |
| 500 | 0 | 500 | 429 |
| 1000 | 0 | 1000 | 429 |

**Post-fix:** health/live/ready/version skipped by global rate limiter. Re-run after deploy: `pnpm --filter @meridian/api stress:health https://api.growzycapital.com`

## Manual cache clearing

**No longer required** after deploy: HTML is never cached; assets are content-hashed per build ID; open tabs auto-reload when `/api/version` buildId changes.

## COMPLETE criteria

Mark **COMPLETE** after Render deploys this commit and stress re-run shows `STRESS_PASS` for 100/500/1000.
