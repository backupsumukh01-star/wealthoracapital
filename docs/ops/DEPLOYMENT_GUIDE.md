# Deployment Guide

Growzy production deployment uses Docker Compose with PostgreSQL, Redis, API, workers, Next.js web, and Nginx.

## Prerequisites

- Docker Engine 24+ and Compose v2
- DNS pointing at the host
- TLS certificates under `infra/nginx/certs/` (`fullchain.pem`, `privkey.pem`) — see that folder’s README
- Secrets prepared from `env.production.example`

Nginx listens on **443 with TLS** and redirects HTTP→HTTPS. HSTS is enabled on the HTTPS server only.

## Environments

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local Postgres + Redis |
| `docker-compose.staging.yml` | Full staging stack on port 8080 |
| `docker-compose.production.yml` | Production stack |

## Quick start (production)

```bash
cp env.production.example .env.production
# Edit secrets: JWT, POSTGRES_PASSWORD, REDIS_PASSWORD, APP_URL, CORS_ORIGIN

export $(grep -v '^#' .env.production | xargs)  # or use a secrets manager
docker compose -f docker-compose.production.yml --env-file .env.production up -d --build
docker compose -f docker-compose.production.yml exec api node -e "require('child_process').execSync('npx prisma migrate deploy',{stdio:'inherit'})"
```

Health checks:

- Liveness: `GET /api/health/live`
- Readiness: `GET /api/health/ready`
- Metrics: `GET /api/metrics`

## Workers

Workers share the API image (`Dockerfile.worker`) and consume BullMQ queues:

- `email`, `notifications`, `trading`, `finance`, `reports`, `scheduler`, `cleanup`

Set `WORKER_GROUP=all` for a combined process, or run multiple services with group-specific values.

## Rollback

1. Point Compose to the previous image tag.
2. If a migration is incompatible, restore DB from the latest backup (see Backup Guide).
3. Re-run readiness checks before opening traffic.
