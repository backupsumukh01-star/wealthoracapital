# Growzy — Project Roadmap

Ordered remaining work from **today’s Phase 2 prep** through production.  
Aligns with `docs/03-development-roadmap.md` and current frontend reality (`PRODUCTION_READY_REPORT.md`).

---

## Status legend

| Tag | Meaning |
|-----|---------|
| ✅ | Done |
| 🔶 | Partial / demo |
| ⬜ | Not started |

---

## Phase 0 — Frontend foundation (mostly complete)

| Task | Status |
|------|--------|
| Marketing site Growzy branding | ✅ |
| Design system / UI kit | ✅ |
| Auth UI (login/register/forgot/reset) | ✅ |
| Contact form UI | ✅ |
| Dashboard / admin shells + placeholders | 🔶 |
| Demo cookie guards | 🔶 |
| SEO, favicon, manifest, OG, 404/500 | ✅ |
| Phase 2 architecture docs (this pack) | ✅ |
| Delete `_tmp_premium_extract` | ⬜ |
| Remove unused marketing orphans | ⬜ |

---

## Phase 1 — Backend bootstrap (start tomorrow)

| Order | Task | Exit criteria |
|------:|------|----------------|
| 1 | Read `MASTER_PROJECT_PLAN.md` + schema/API docs | Team aligned |
| 2 | Scaffold Express app per `BACKEND_ARCHITECTURE.md` | `/health` live |
| 3 | Env validation, Pino, Helmet, CORS, requestId | Middleware chain |
| 4 | Prisma schema from `DATABASE_SCHEMA.md` + first migration | Empty DB migrates |
| 5 | Seed SUPER_ADMIN + default settings | Can log in as admin (API) |
| 6 | Shared Zod packages for auth/money strings | Web can import types |

**Do not** ship money routes before wallet module tests exist.

---

## Phase 2 — Authentication (real)

| Order | Task |
|------:|------|
| 1 | Register / verify email / login / logout / refresh |
| 2 | argon2id + cookies `gz_at`/`gz_rt` + CSRF |
| 3 | Replace frontend demo auth with API |
| 4 | Admin 2FA |
| 5 | Google OAuth PKCE (optional same sprint) |
| 6 | Remove `mfx_at` demo cookie |

---

## Phase 3 — Database hardening

| Order | Task |
|------:|------|
| 1 | Ledger triggers + CHECKs |
| 2 | Indexes from schema doc |
| 3 | Outbox table + poller |
| 4 | Backup script (pg_dump) wired in `infra/` |

---

## Phase 4 — Wallet & ledger

| Order | Task |
|------:|------|
| 1 | Wallet create-on-register |
| 2 | Ledger post service (only writer) |
| 3 | `GET /wallet`, `/wallet/ledger`, `/wallet/summary` |
| 4 | Reconciliation job |
| 5 | Wire dashboard overview to API |

---

## Phase 5 — Deposits & withdrawals

| Order | Task |
|------:|------|
| 1 | Payment methods admin CRUD |
| 2 | Deposit create + proof upload + StorageProvider |
| 3 | Admin approve/reject |
| 4 | Withdrawal lock/approve/reject/mark-paid |
| 5 | Payout methods user CRUD |
| 6 | Replace dashboard Placeholders |

---

## Phase 6 — Trading desk

| Order | Task |
|------:|------|
| 1 | Admin trade CRUD |
| 2 | Trading day publish |
| 3 | Public performance endpoints |
| 4 | Replace marketing demo series with API (ISR/cache) |

---

## Phase 7 — Daily return engine (highest risk)

| Order | Task |
|------:|------|
| 1 | Preview endpoint |
| 2 | Apply with full idempotency |
| 3 | Notifications + email templates |
| 4 | Reverse (SUPER_ADMIN) |
| 5 | Load test + ledger invariants |

---

## Phase 8 — Notifications & email

| Order | Task |
|------:|------|
| 1 | React Email templates |
| 2 | SMTP + outbox worker |
| 3 | In-app notifications API + dashboard UI |
| 4 | Broadcast composer |
| 5 | Preference centre (non-security events) |

---

## Phase 9 — Admin completeness

| Order | Task |
|------:|------|
| 1 | Users management UI ↔ API |
| 2 | Audit log viewer + export |
| 3 | Settings UI |
| 4 | Reports |
| 5 | Support tickets (if in v1 scope) |

---

## Phase 10 — Frontend finish

| Order | Task |
|------:|------|
| 1 | Remove all Placeholder screens |
| 2 | Empty/error/loading wired to real queries |
| 3 | TanStack Query against `/api/v1` |
| 4 | Contact form → API + captcha |
| 5 | Real CSV/PDF downloads |
| 6 | Brand cleanup (`@meridian` → `@growzy` optional) |

---

## Phase 11 — Testing

| Order | Task |
|------:|------|
| 1 | Unit: money/ledger rounding |
| 2 | Integration: deposit → apply → withdraw |
| 3 | Idempotency fuzz tests |
| 4 | Playwright smoke (login, guard, contact) |
| 5 | Lighthouse CI on marketing |

---

## Phase 12 — Deployment

| Order | Task |
|------:|------|
| 1 | Staging VPS + Nginx + PM2 (`docs/15`) |
| 2 | Secrets management |
| 3 | DB backups + restore drill |
| 4 | Sentry / uptime |
| 5 | Domain + TLS |
| 6 | Production go-live checklist |

---

## Phase 13 — Production

| Order | Task |
|------:|------|
| 1 | Compliance owner sign-off |
| 2 | Disable demo credentials |
| 3 | Maintenance runbook |
| 4 | On-call / alerting |
| 5 | Soft launch → monitor ledger reconciliation |

---

## Parallel tracks (non-blocking)

- Content: About team, legal final copy  
- Design: unused component cleanup  
- Docs: retire Meridian naming in `docs/README.md`  
- Future: KYC documents, Telegram, BullMQ, multi-currency  

---

## Suggested calendar (indicative)

| Week | Focus |
|------|--------|
| 1 | Bootstrap + Prisma + Auth |
| 2 | Wallet + Ledger |
| 3 | Deposits / Withdrawals |
| 4 | Trading + Daily return |
| 5 | Notifications + Admin UI wiring |
| 6 | Hardening + staging |
| 7 | Test + prod gate |

Adjust to team size; **daily return engine must not be rushed**.
