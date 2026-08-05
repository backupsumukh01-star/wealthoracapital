# Monitoring Guide

## Endpoints

| Path | Purpose |
|------|---------|
| `/api/health` | Aggregate health (DB + Redis + drivers) |
| `/api/health/live` | Process liveness |
| `/api/health/ready` | Dependency readiness |
| `/api/metrics` | Prometheus text exposition |
| `/api/version` | Build / runtime version |

## Prometheus

Scrape config: `infra/monitoring/prometheus.yml`

Key metrics:

- `growzy_http_request_duration_seconds` — API latency
- `growzy_http_requests_total` — request volume / status
- `growzy_queue_waiting{queue=...}` — BullMQ depth
- `growzy_redis_up` / `growzy_db_up`
- Default Node process metrics (`growzy_process_*`, `growzy_nodejs_*`)

## Logging

API uses Pino structured JSON logs in production (`LOG_LEVEL`).

- Request logs via `pino-http` (health/docs excluded)
- Errors include `requestId`
- Audit events remain in the application audit tables / logger modules

## Error tracking

Set `SENTRY_DSN` and optional `SENTRY_TRACES_SAMPLE_RATE`.

`initSentry()` no-ops without DSN; install `@sentry/node` in the image when enabling.

## Suggested alerts

1. Readiness failing for > 2 minutes
2. 5xx rate > 1% for 5 minutes
3. Queue waiting > 1000 for 10 minutes
4. Redis down while `REDIS_REQUIRED=true`
5. Disk > 85% on data volumes
