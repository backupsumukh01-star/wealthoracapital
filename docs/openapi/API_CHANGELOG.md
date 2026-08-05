# Growzy API Changelog

All notable API documentation and contract changes are recorded here.
Business-breaking API changes will use deprecation windows described below.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows the OpenAPI `info.version` field (currently **1.0.0** = Phases 1-6 complete).

---

## [1.0.0] — 2026-08-05

### Added

- OpenAPI **3.1.0** specification covering every Express endpoint (200 paths / 233 operations).
- Interactive **Swagger UI** at `/api/docs`.
- Raw specs at `/api/docs/json` and `/api/docs/yaml`.
- **Redoc** at `/api/redoc`.
- Postman Collection v2.1 + local environment (`docs/openapi/collections/`).
- Insomnia export format 4 (`docs/openapi/collections/growzy.insomnia.json`).
- Documented security schemes: cookie JWT (`mfx_at`), refresh cookie (`mfx_rt`), CSRF cookie (`mfx_csrf`), Bearer JWT (gateway-ready).
- Standard error responses: 400, 401, 403, 404, 409, 422, 429, 500 with examples.
- `x-permission` / `x-admin` extensions on secured operations.
- Reusable schemas for users, wallets, trades, reports, support, notifications, CMS, KYC, settings, errors, pagination.
- Generator script `scripts/generate-openapi.mjs` (single source of truth).

### Modules documented

Authentication, Users, Profile, Sessions, Admin, Dashboard, RBAC, Permissions, KYC, Wallet, Ledger, Deposits, Withdrawals, Transactions, Trading, Performance, Portfolio, Daily Returns, CMS, Media, Reports, Email, Notifications, Support, Broadcasts, Settings, Feature Flags, Health, Version.

---

## Version history (product phases)

| API version | Date | Scope |
|-------------|------|--------|
| 0.1.x | 2026-08 | Phase 1 Auth |
| 0.2.x | 2026-08 | Phase 2 Users / Admin / RBAC |
| 0.3.x | 2026-08 | Phase 3 KYC |
| 0.4.x | 2026-08 | Phase 4 Wallet / Ledger / Finance |
| 0.5.x | 2026-08 | Phase 5 Trading / Performance |
| **1.0.0** | **2026-08-05** | **Phase 6 Ops + full OpenAPI 3.1** |

---

## Deprecation strategy

1. **Announce** — Mark operations/schemas with `deprecated: true` and a sunset note in the description at least **30 days** before removal.
2. **Dual-run** — Keep old routes working alongside replacements when possible.
3. **Changelog** — Record every deprecation and removal in this file under `Deprecated` / `Removed`.
4. **Clients** — Postman/Insomnia collections are regenerated from OpenAPI; import the latest after each release.
5. **No silent breaks** — Path removals require a major `info.version` bump (e.g. 1.x → 2.0.0).

---

## How to regenerate

```bash
node scripts/generate-openapi.mjs
# or
pnpm --filter @meridian/api openapi:generate
```

Artifacts:

- `docs/openapi/openapi.json` / `openapi.yaml`
- `apps/api/openapi/` (served at runtime)
- `docs/openapi/collections/*`
