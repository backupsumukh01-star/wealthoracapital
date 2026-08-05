# FINAL PRODUCTION AUDIT REPORT — Growzy

**Audit date:** 2026-08-05  
**Auditor role:** Chief Software Architect / Principal Security / FinTech / DevOps  
**Scope:** Full monorepo (API, web, Prisma, Redis/BullMQ, Docker, CI/CD, docs)  
**Constraint honored:** No new product features; no UI redesign; no module rewrites  

---

## Executive Summary

Growzy is **conditionally production-ready**. Core product surfaces (auth, KYC, wallet/ledger, trading, CMS, support, ops docs, CI) are present and largely coherent. This audit found **critical FinTech and infrastructure gaps** that must be closed or explicitly accepted before unrestricted go-live.

**Safe fixes applied in this audit pass** (committed with this report set):

1. Ledger idempotency no longer re-mutates wallet balances on replay  
2. Double-submit CSRF protection + web client CSRF headers  
3. Metrics gated (token / hidden in production without token); Nginx denies `/api/metrics`  
4. OpenAPI/Swagger disabled by default in production (`ENABLE_API_DOCS`)  
5. Media MIME allowlist  
6. Production uploads volume; Nginx HSTS deferred until real TLS  
7. `WORKER_CONCURRENCY` honored  

**Overall production readiness score: 71%**

**Verdict:** Soft launch / limited capital OK after GO-LIVE CHECKLIST. Full public FinTech scale requires TLS, object storage, distribution atomicity hardening, and dependency remediation.

---

## Category scores (1–10)

| Category | Score | Notes |
|----------|------:|-------|
| Architecture & modularity | 7.5 | Clear routes→controllers→services; some large services |
| Security | 7.0 | CSRF/metrics/docs hardened; virus scan noop; dep advisories |
| FinTech integrity | 6.5 | Ledger FOR UPDATE + balance check; distribution still fragile |
| Database | 7.5 | Decimal(20,8), indexes, uniques; CASCADE risk on money trees |
| Performance | 7.0 | Caching hooks exist; N+1 in snapshots/distribution |
| Scalability | 5.5 | Single-node compose; local disk uploads |
| Infrastructure / DevOps | 6.5 | Compose+CI solid; TLS incomplete; backups local-only |
| Observability | 7.5 | Health/ready/metrics/Sentry abstraction |
| Documentation | 8.0 | Ops guides + OpenAPI + phase reports |
| Testing / QA | 7.5 | 58 API tests; coverage still modest |
| Dependencies | 5.0 | 1 critical + 10 high (mostly transitive `tar` via bcrypt) |
| Code quality / debt | 7.0 | Good patterns; cleanup jobs no-op; some duplication |

**Weighted overall: ~71%**

---

## Capacity estimates (not load-tested)

Assumptions: ~4 vCPU / 8 GB single host; Redis cache on; 1 API + 1 worker; ~70% reads.

| Metric | Estimate |
|--------|----------|
| Concurrent users (session open) | **150–400** |
| Concurrent actively requesting | **40–80** |
| Sustained API throughput | **50–150 req/s** |
| Burst | **200–300 req/s** |
| Deployment reliability (with checklist) | **~94–97%** successful deploys |
| Deployment reliability (TLS/storage unresolved) | **~85–90%** |

---

## Critical issues (remaining / accepted risk)

| ID | Issue | Area |
|----|-------|------|
| C1 | TLS incomplete — Nginx listens HTTP only; prod maps 443 without certs | Infra |
| C2 | Local file storage — no shared/object store; multi-API scale unsafe | Infra |
| C3 | Daily distribution not fully atomic / hard to resume on `FAILED` | FinTech |
| C4 | Profit/trade reversal paths largely unimplemented | FinTech |
| C5 | Transitive **critical** `tar` advisory via `bcrypt` → `node-pre-gyp` | Dependencies |

## High issues

| ID | Issue |
|----|-------|
| H1 | Virus scanning is noop (`SKIPPED`) for KYC/media |
| H2 | BullMQ enqueue falls back to in-process on Redis blip (multi-replica risk) |
| H3 | Offsite backups not automated; Redis AOF not in backup scripts |
| H4 | Staging Redis unauthenticated / weak defaults |
| H5 | Admin wallet adjust idempotency keys use `Date.now()` |
| H6 | Fees / `SYS:FEES` posting incomplete; some fee UX gaps |
| H7 | Security CI `pnpm audit \|\| true` soft-fails |
| H8 | Public uploads for non-KYC paths; media allowlist helps but no AV |

## Medium / Low

See `docs/audit/TECHNICAL_DEBT_REPORT.md` and scorecards.

---

## Architecture review (summary)

- **Strengths:** Monorepo boundaries, Prisma repository usage in many domains, permission middleware, OpenAPI coverage, job driver abstraction (memory ↔ BullMQ).  
- **Weaknesses:** Very large finance/trading services; cleanup scheduled jobs are stubs; session store still JWT cookies (OK) but CSRF was missing until this pass; local storage blocks HA.

## Security review (summary)

- Cookie httpOnly access/refresh + SameSite — good.  
- CSRF now enforced outside tests.  
- RBAC appears to block investor→admin in tests.  
- Metrics/docs exposure reduced.  
- Remaining: TLS, AV, dependency advisories, ensure all multipart clients send CSRF (apiClient + upload helpers updated).

## FinTech review (summary)

- Double-entry `postBalanced` with debit=credit check and wallet `FOR UPDATE` — strong.  
- Idempotent ledger replay no longer double-credits wallets (**fixed**).  
- Distribution still loops per wallet with separate transactions — resume/partial failure risk remains (**recommendation only**).  
- Reversals not implemented — do not enable lossy ops without design.

## Performance & scalability

- Prometheus latency histograms available.  
- Horizontal API scale needs shared uploads + fail-closed jobs + PgBouncer.  
- Bundle: Next `standalone` + `optimizePackageImports` — good baseline.

## Infrastructure

- Dev/staging/prod compose present; workers + Redis + Postgres.  
- CI lint/typecheck/test/build + Docker build workflow.  
- Nginx rate limits; metrics denied at edge.

## Documentation

- Ops set complete under `docs/ops/`.  
- README + OpenAPI + phase completion reports exist.  
- This audit adds `docs/audit/*` artifacts.

---

## Recommendations (priority order)

1. Terminate real TLS (LB or Nginx `ssl_*`) before public traffic; then enable HSTS.  
2. Move uploads to S3/compatible object storage.  
3. Make daily distribution fully transactional + resumable; add reconciliation job.  
4. Implement ledger reversals or disable UI affordances.  
5. Replace/overrides for `tar`/`bcrypt` advisory path; fail CI on critical.  
6. Wire ClamAV (or cloud AV) into `virusScanner`.  
7. Fail closed on BullMQ enqueue in production (`JOB_DRIVER=bullmq` + no in-process side effects).  
8. Offsite backup + restore drill quarterly.

---

## Safe fixes included in this commit

Documented above. Dangerous items left as recommendations only.
