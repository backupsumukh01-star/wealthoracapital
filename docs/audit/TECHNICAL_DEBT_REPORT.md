# TECHNICAL DEBT REPORT — Growzy

Generated: 2026-08-05

## P0 — Address before scale / large AUM

| Debt | Location | Risk | Suggested direction |
|------|----------|------|---------------------|
| Distribution not single-transaction / weak resume | `distribution.service.ts` | Double-pay / stuck FAILED | Redesign with saga + row locks + resume |
| No profit reversal engine | schema flags only | Manual repair | Implement compensating ledger posts |
| Local storage only | `STORAGE_DRIVER=local` | Data loss / no HA | S3/MinIO adapter |
| TLS incomplete | `infra/nginx` | MITM / trust | Certs + HTTPS server block |
| bcrypt→tar critical advisory | lockfile | Supply chain | Override / upgrade toolchain |

## P1 — Next sprint

| Debt | Notes |
|------|-------|
| Noop virus scanner | Wire ClamAV |
| In-process job fallback | Fail closed in prod |
| Admin adjust `Date.now()` keys | Require client idempotency |
| Fee posting to `SYS:FEES` incomplete | Align product + ledger |
| Session/token cleanup job stubs | Implement or remove schedules |
| Soft-fail security audit in CI | Fail on critical |
| N+1 snapshot / notify loops | Batch queries |
| Large service files (ledger/trade/deposit) | Split without behavior change |

## P2 — Maintainability

| Debt | Notes |
|------|-------|
| Duplicate Dockerfiles API/worker | Multi-stage target |
| Docs CDN scripts in Swagger HTML | Pin + SRI |
| `APP_ENV` vs `NODE_ENV` confusion | Document only |
| Coverage ~29% lines | Raise on finance/auth |
| OpenAPI regenerate discipline | CI check drift |
| Staging weak Redis password | Match prod posture |

## Intentionally deferred (accepted)

- Full CD pipeline (push images + auto-deploy)
- Multi-region DR
- PgBouncer until connection pressure observed
- Real-time trading market feed (out of scope)

## Debt burn-down suggestion

1. Week 1: TLS + object storage + audit CI fail-on-critical  
2. Week 2: distribution atomicity + reconciliation job  
3. Week 3: AV + fail-closed BullMQ + fee ledger completeness  
4. Week 4: coverage on finance paths + dependency overrides  
