# Growzy Production Stability Report

Date: 2026-08-05  
Target uptime: **99.9%+**  
Expected uptime (post-fix): **99.9%** on Render starter with health checks + auto-restart

## Root causes found

| # | Issue | Root cause | Severity | Fix |
|---|-------|------------|----------|-----|
| 1 | Cron failures → unhandled rejections | `scheduler.runNow` had no `catch`; `void runNow()` leaked rejections | **Critical** | Catch + log + crash buffer + owner alert after 3 failures |
| 2 | Memory job queue rethrew | Failed jobs threw into scheduler → process risk | **Critical** | Swallow after log/record (jobs never take down API) |
| 3 | UncaughtException always killed API | Single bug outside Express forced full shutdown | **High** | Alert owners; `EXIT_ON_UNCAUGHT` (default false stay-alive; set true for clean Render restart) |
| 4 | No request timeout | Hung handlers could exhaust concurrency | **High** | `REQUEST_TIMEOUT_MS` middleware + Node `server.requestTimeout` |
| 5 | Prisma no reconnect / slow query visibility | Disconnects surfaced as random 500s | **High** | Retry connect, `ensureDatabase`, circuit breaker, slow-query extension |
| 6 | 5xx poorly contextualized | Missing requestId/user/route/IP/UA/stack in ops view | **Medium** | Enriched error handler + throttled owner alerts |
| 7 | No resource watchdog | OOM / disk full / DB blips silent until outage | **High** | `stability-monitor` cron (1m): mem≥85%, CPU≥90%, disk≥80%, DB, storage, email fail streak |
| 8 | Health page incomplete | Missing uptime, latency, commit, crashes | **Medium** | Expanded `/admin/health` widgets + Reliability panel |

## PASS / FAIL checklist

| Check | Result |
|------|--------|
| Unhandled rejection does not crash API | **PASS** |
| Scheduled job failure isolated | **PASS** |
| Background queue failure isolated | **PASS** |
| Request timeout (30s default) | **PASS** |
| Graceful SIGTERM / SIGINT shutdown | **PASS** |
| Prisma connect retry + reconnect | **PASS** |
| Slow query logging (≥1s) | **PASS** |
| Transient retry helper | **PASS** |
| Circuit breaker (DB/Redis ready) | **PASS** |
| Owner alert on unhandled exception/rejection | **PASS** |
| Owner alert on DB disconnect | **PASS** |
| Owner alert on mem/CPU/disk thresholds | **PASS** |
| Owner alert on email fail streak | **PASS** |
| Owner alert on storage unwritable | **PASS** |
| System Health: API/DB uptime | **PASS** |
| System Health: avg response time | **PASS** |
| System Health: memory/CPU/disk | **PASS** |
| System Health: queues / email / jobs | **PASS** |
| System Health: crashes / errors / restarts | **PASS** |
| System Health: git commit / Render instance / deploy | **PASS** |
| Web Reliability panel | **PASS** |
| Automated stability unit tests | **PASS** |
| Memory leak proof (heap dump / long soak) | **PARTIAL** — monitor + alerts; run soak on Render |
| N+1 query audit of all routes | **PARTIAL** — slow-query logger flags offenders |
| Web (Next.js) process crash alerts | **PARTIAL** — Render restarts web; API watchdog covers API. Wire Render notify → `ADMIN_ALERT_EMAILS` in dashboard |
| Live 99.9% measured over 30 days | **FAIL** until post-deploy observation window |

## Performance recommendations

1. Prefer `JOB_DRIVER=bullmq` + Redis in production so heavy crons leave the web dyno.
2. Append `?connection_limit=10&pool_timeout=20` to `DATABASE_URL` on Render Postgres.
3. Set `EXIT_ON_UNCAUGHT=true` after confirming Render auto-restart + health checks.
4. Set `ADMIN_ALERT_EMAILS=info@growzycapital.com` (and backups).
5. Watch System Health → Avg response / Slow query logs weekly; fix any route >500ms p95.
6. Ensure persistent disk `/data` remains mounted (upload/KYC stability).

## Reliability score

| Dimension | Score |
|-----------|-------|
| Process isolation | 9/10 |
| DB resilience | 8/10 |
| Observability | 9/10 |
| Owner alerting | 9/10 |
| Auto recovery | 8/10 |
| **Overall** | **8.6/10** |

## Deploy notes

```
ADMIN_ALERT_EMAILS=info@growzycapital.com
REQUEST_TIMEOUT_MS=30000
EXIT_ON_UNCAUGHT=false
```

Health check path remains `/api/health` (Render).
