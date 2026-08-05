# Production Runbook

## Daily checks

1. `GET /api/health` — database `up`, redis `up`
2. Prometheus / `/api/metrics` — no sustained 5xx spike
3. BullMQ queue waiting gauges — `growzy_queue_waiting`
4. Disk: Postgres volume, Redis AOF, `uploads/`, `backups/`

## Common incidents

### API 503 on readiness

- Check Postgres: `docker compose exec postgres pg_isready`
- Check Redis: `docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping`
- Confirm `REDIS_REQUIRED` and network DNS (`postgres`, `redis`)

### Jobs not running

- Confirm `JOB_DRIVER=bullmq` and worker containers healthy
- Inspect Redis keys / BullMQ UI equivalent via `getQueueCounts`
- Restart worker: `docker compose restart worker`

### High latency

- Inspect `growzy_http_request_duration_seconds`
- Verify Redis cache (`CACHE_DRIVER=redis`)
- Check DB connection saturation and slow queries

### Memory pressure

- Restart API/worker with rolling strategy
- Reduce `WORKER_CONCURRENCY`
- Confirm no unbounded in-memory job fallback

## Deploy procedure

1. Backup DB (`scripts/backup/backup-db.sh`)
2. Pull / build images
3. `prisma migrate deploy`
4. Rolling restart API then workers
5. Smoke: login, wallet balance, health/ready

## Contacts

Document on-call rotation and Sentry project ownership in your org wiki.
