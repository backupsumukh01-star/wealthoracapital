# Disaster Recovery Guide

## RTO / RPO targets (suggested)

- RPO: ≤ 24h (daily DB + media backups); tighten with continuous WAL archiving if required
- RTO: ≤ 4h for full stack restore on a warm standby host

## Scenarios

### 1. Database corruption / accidental delete

1. Stop API and workers (`docker compose stop api worker`)
2. Restore latest good dump: `DATABASE_URL=... bash scripts/backup/restore-db.sh backups/postgres/<file>.sql.gz`
3. Run `prisma migrate deploy` if needed
4. Start API/workers; verify `/api/health/ready`
5. Spot-check ledger balances and recent trades

### 2. Redis / BullMQ loss

Redis is cache + queue (not system of record).

1. Restart Redis with AOF if available
2. Restart workers — repeatable jobs re-register on API boot
3. Re-enqueue critical one-off jobs if needed
4. Confirm cache miss path still serves from Postgres

### 3. Worker crash loop

1. Inspect logs: `docker compose logs worker --tail=200`
2. Set `WORKER_GROUP=all` on a known-good image
3. Drain failed jobs after root-cause fix
4. Scale concurrency down if OOM

### 4. Full host loss

1. Provision new host; install Docker
2. Restore config backup (compose + nginx templates)
3. Restore Postgres + media
4. Populate secrets from vault (not from config backup)
5. `docker compose -f docker-compose.production.yml up -d --build`
6. DNS cutover after readiness green

## Post-recovery checklist

- [ ] Health / ready / metrics OK
- [ ] Login + KYC read path
- [ ] Deposit/withdraw read-only audit
- [ ] Email outbox processing
- [ ] Sentry / alerts re-armed
