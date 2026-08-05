# FINAL RELEASE CHECKLIST — Growzy

Release candidate audit companion (engineering + ops).

## Pre-merge

- [x] Feature freeze for business modules (audit phase)  
- [x] API typecheck / lint / unit+integration tests green (58/58 at audit)  
- [x] Safe audit fixes merged (CSRF, ledger idempotency, metrics, docs gate, MIME, volumes)  
- [ ] No open Critical FinTech defects without written waiver  
- [ ] Dependency criticals reviewed  

## Build & artifact

- [ ] `pnpm --filter @meridian/api build`  
- [ ] `pnpm --filter @meridian/web build`  
- [ ] Docker images build (CI Docker workflow or local)  
- [ ] Image tags recorded (`api`, `worker`, `web`)  

## Deploy

- [ ] Backup DB  
- [ ] `prisma migrate deploy`  
- [ ] Compose/K8s roll API → worker → web → nginx  
- [ ] Ready probe green  
- [ ] Smoke: login, wallet read, health, metrics (tokenized)  

## Post-deploy

- [ ] Error budget / Sentry quiet for 30–60 min  
- [ ] Queue depth stable  
- [ ] First scheduled job observed (email outbox / CMS publish)  
- [ ] Announce go-live to stakeholders  

## Rollback

- [ ] Previous image tags known  
- [ ] DB backup restore procedure rehearsed (`scripts/backup/restore-db.sh`)  
- [ ] Feature flags / settings kill-switches identified (deposits/withdrawals disable)  

## Documents attached

- `docs/audit/FINAL_PRODUCTION_AUDIT_REPORT.md`  
- `docs/audit/GO_LIVE_CHECKLIST.md`  
- `docs/audit/TECHNICAL_DEBT_REPORT.md`  
- `docs/audit/SECURITY_SCORECARD.md`  
- `docs/audit/PERFORMANCE_SCORECARD.md`  
