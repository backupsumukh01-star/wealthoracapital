# Infrastructure

Production-oriented assets for Growzy.

| Path | Purpose |
|------|---------|
| `nginx/nginx.conf` | Reverse proxy, compression, security headers, rate limits |
| `monitoring/prometheus.yml` | Prometheus scrape config for `/api/metrics` |
| `../docker-compose.yml` | Dev: Postgres + Redis |
| `../docker-compose.staging.yml` | Staging full stack |
| `../docker-compose.production.yml` | Production full stack |
| `../scripts/backup/` | DB / media / config backup & restore |
| `../docs/ops/` | Deployment, runbook, monitoring, backup, DR, CI/CD |

See also `docs/15-deployment-checklist.md`.
