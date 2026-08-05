# Production Readiness Report — Growzy

**Date:** 2026-08-05  
**Scope:** Deployment, Redis, BullMQ, workers, monitoring, backups, CI/CD, security hardening  
**Constraint:** No new business features

---

## Verdict

Growzy is production-ready for containerized deployment. Core ops surfaces (Redis cache, BullMQ workers, health/metrics, backups, GitHub Actions, Nginx, compose stacks, and ops docs) are in place. Local Docker CLI was not available on the build agent; image builds are defined and covered by the Docker GitHub Actions workflow.

---

## Delivered

### Redis
- Singleton client with graceful fallback (`apps/api/src/services/redis/client.ts`)
- Distributed locks (`withRedisLock`)
- Cache driver switch (`CACHE_DRIVER=redis|memory`) + namespaced helpers (session, API, leaderboard, performance, temporary)
- Redis-backed rate limiting (`RATE_LIMIT_STORE=redis`)

### BullMQ
- Per-group queues: email, notifications, trading, finance, reports, scheduler, cleanup, retry
- Job schedulers via BullMQ v6 `upsertJobScheduler` (migrated off in-memory scheduler when `JOB_DRIVER=bullmq`)
- API enqueue with in-process fallback if Redis is down

### Workers
- Dedicated entry: `apps/api/src/worker.ts` / `dist/worker.js`
- `WORKER_GROUP` selects queue group(s); `all` runs every group
- Docker image: `apps/api/Dockerfile.worker`

### Docker / Compose / Nginx
- Dockerfiles: API, worker, web (`output: 'standalone'`)
- Compose: `docker-compose.yml` (dev), `.staging.yml`, `.production.yml`
- Nginx: compression, security headers, API/auth rate zones, static uploads proxy

### Observability
- Health: `/api/health`, `/api/health/live`, `/api/health/ready`
- Prometheus: `/api/metrics` (+ `infra/monitoring/prometheus.yml`)
- Sentry abstraction (optional `@sentry/node` + DSN)
- Structured JSON Pino logs (pretty only in development)

### Security
- Helmet CSP / HSTS (prod) / referrer / permissions
- Secure cookie flag for production compose
- Next.js production CSP + HSTS headers
- Nginx HSTS / XSS-adjacent headers / rate limits

### Backups & DR
- Scripts under `scripts/backup/` (DB, media, config, restore, run-all)
- Docs: Backup + Disaster Recovery guides

### CI/CD
- `.github/workflows/ci.yml` — lint, typecheck, test, build
- `.github/workflows/docker.yml` — image builds
- `.github/workflows/security.yml` — audit + secret scan

### Documentation
- `docs/ops/DEPLOYMENT_GUIDE.md`
- `docs/ops/PRODUCTION_RUNBOOK.md`
- `docs/ops/MONITORING_GUIDE.md`
- `docs/ops/BACKUP_GUIDE.md`
- `docs/ops/DISASTER_RECOVERY_GUIDE.md`
- `docs/ops/CICD_GUIDE.md`
- `env.production.example`

---

## Verification (this environment)

| Check | Result |
|-------|--------|
| API TypeScript | Pass |
| API ESLint | Pass |
| API Vitest | 58/58 pass |
| API build (`server` + `worker`) | Pass |
| Docker CLI local build | **Not available** on host (covered by GH Actions) |
| Redis live smoke | Optional — use `docker compose up` then set `REDIS_URL` |
| BullMQ live smoke | Requires Redis + `JOB_DRIVER=bullmq` |

---

## Production enablement checklist

1. Copy `env.production.example` → `.env.production` and rotate all secrets  
2. `docker compose -f docker-compose.production.yml --env-file .env.production up -d --build`  
3. Run Prisma migrations inside the API container  
4. Confirm `/api/health/ready` returns ready with Redis `up`  
5. Confirm workers log “Growzy workers ready”  
6. Schedule `scripts/backup/run-all.sh` via cron  
7. Point Prometheus at `/api/metrics`  
8. Set `SENTRY_DSN` and install `@sentry/node` in the image when enabling error tracking  

---

## Defaults for local / CI

`JOB_DRIVER=memory`, `CACHE_DRIVER=memory`, `RATE_LIMIT_STORE=memory` so developers and CI do not require Redis.
