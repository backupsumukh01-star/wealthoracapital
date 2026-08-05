# GO-LIVE CHECKLIST — Growzy

Use before any production traffic that moves real money.

## Blockers (must complete)

- [ ] TLS certificates installed (LB or Nginx `ssl_certificate` / `ssl_certificate_key`); smoke HTTPS
- [ ] HSTS enabled only after HTTPS verified
- [ ] Secrets rotated: JWT, Postgres, Redis, cookie domain, SMTP
- [ ] `COOKIE_SECURE=true`, `REDIS_REQUIRED=true`, `JOB_DRIVER=bullmq`, `CACHE_DRIVER=redis`
- [ ] `METRICS_TOKEN` set; Prometheus scrapes with bearer token (Nginx still denies public `/api/metrics`)
- [ ] `ENABLE_API_DOCS=false` in production (or VPN-only)
- [ ] `CSRF_PROTECTION=true` verified with browser login + mutating call
- [ ] Prisma `migrate deploy` on production DB; backup taken first
- [ ] Object storage **or** durable shared volume for `/uploads` confirmed across API restarts
- [ ] Offsite DB backup job scheduled; test restore to scratch DB
- [ ] Workers healthy (`WORKER_GROUP=all` or split); repeatable jobs registered
- [ ] Sentry DSN live **or** explicit accept risk
- [ ] Admin MFA / break-glass accounts documented

## FinTech gate

- [ ] Manual deposit → approve → wallet credit reconciled to ledger
- [ ] Withdrawal lock → complete path tested with small amount
- [ ] Daily return dry-run on staging with idempotency key replay (no double credit)
- [ ] Confirm reversal UI/APIs disabled or implemented
- [ ] Fee behavior signed off by product/finance

## Security gate

- [ ] `pnpm audit --prod` reviewed; criticals accepted or mitigated
- [ ] Rate limits tuned for expected traffic
- [ ] CORS origins exact production frontends only
- [ ] KYC documents not publicly listable under `/uploads/kyc`
- [ ] Security headers checked via securityheaders.com / curl

## Ops gate

- [ ] `/api/health/live` and `/api/health/ready` monitored
- [ ] Alerting on 5xx, readiness, queue depth, disk
- [ ] Runbook owners named (`docs/ops/PRODUCTION_RUNBOOK.md`)
- [ ] Rollback image tag identified

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Eng lead | | | |
| Security | | | |
| Finance/ops | | | |
| Product | | | |
