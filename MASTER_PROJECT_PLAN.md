# Growzy — Master Project Plan

**Single source of truth for the remainder of the Growzy platform.**  
**Effective:** 2026-08-02 · **Phase:** Backend preparation complete · Implementation not started  

If a senior engineer joins tomorrow, start here, then follow the linked documents in order.

---

## 1. What Growzy is

Growzy is an **AI-assisted Forex investment platform** where:

- Investors deposit funds (manual rails + proof).  
- The trading desk publishes trades and a **daily return %**.  
- The system distributes profit/loss to eligible wallets via an **immutable ledger**.  
- Investors can withdraw subject to review and locks.  

It is **not** a self-directed brokerage. Users do not place trades.

**Compliance:** Regulatory posture, custody, and jurisdiction must be resolved by the operator before accepting real money. See legacy `docs/00-project-overview.md` §8.

---

## 2. Current state (as of this plan)

| Layer | State |
|-------|--------|
| Marketing + Auth UI | Growzy-branded, production-quality demo |
| Dashboard / Admin UI | Shells + many Placeholders |
| API | Empty Express stubs |
| Database | Designed; not applied as production schema yet |
| Docs | Full Meridian-era set in `docs/` + this Growzy Phase 2 pack at repo root |

**Reports:** `PROJECT_AUDIT.md`, `UI_AUDIT_REPORT.md`, `PRODUCTION_READY_REPORT.md`  
**Frontend completion ~86% · Production readiness ~76/100** (demo auth, no money API).

---

## 3. Document map (read in this order)

| # | Document | Purpose |
|---|----------|---------|
| 1 | **This file** | Orientation + decisions |
| 2 | `PROJECT_AUDIT.md` | Cleanup, branding debt, dead code |
| 3 | `BACKEND_ARCHITECTURE.md` | Folders, layers, modules, middleware |
| 4 | `DATABASE_SCHEMA.md` | Tables, indexes, constraints |
| 5 | `API_DOCUMENTATION.md` | Endpoints contract |
| 6 | `USER_FLOW.md` | Investor journeys |
| 7 | `ADMIN_FLOW.md` | Operator journeys |
| 8 | `DAILY_RETURN_ENGINE.md` | Settlement algorithm |
| 9 | `SECURITY_PLAN.md` | Controls |
| 10 | `PROJECT_ROADMAP.md` | Ordered delivery |
| — | `docs/00`–`15` | Deeper Meridian-era specs (still valid technically; brand outdated) |

---

## 4. Project structure (target)

```
growzy/  (repo may still be named meridian-fx)
├── apps/
│   ├── web/                 # Next.js 15 — UI contract
│   └── api/                 # Express 5 — to be built
├── packages/
│   ├── shared/              # Zod, routes, MoneyString utils
│   └── config/              # ESLint/TS bases
├── docs/                    # Legacy detailed specs
├── infra/                   # Nginx, PM2, backups
└── [Phase 2 *.md at root]   # This planning pack
```

**Dependency direction:** `web` → `shared` ← `api`. Never `api` → `web`.

---

## 5. Architecture summary

```
Browser → Nginx
           ├─ /        → Next.js (web:3000)
           └─ /api/v1  → Express (api:4000)
                            ├─ PostgreSQL
                            ├─ Local/S3 uploads
                            └─ SMTP
```

- **Modular monolith** with clear module boundaries.  
- **Wallet module** is the only writer of `ledger_entries`.  
- **Outbox** for email/notifications (never block money TX).  
- **Cron** on PM2 instance 0 only.  

Full detail: `BACKEND_ARCHITECTURE.md`.

---

## 6. Database summary

**Postgres 16 + Prisma.** Money as `DECIMAL(20,8)`. Ledger append-only.

Core tables: Users, Wallets, LedgerEntries, Deposits, Withdrawals, Trades, TradingDays, DailyReturnRuns, ProfitDistributions, Notifications, EmailLogs, AuditLogs, Settings, Referrals, SupportTickets, Documents (KYC future), OutboxEvents, Sessions/Tokens, Payment/Payout methods.

**Invariants:**

1. Wallet balance = Σ ledger amounts.  
2. One daily return run per trading day (unique).  
3. Idempotency keys on all money posts.  

Full detail: `DATABASE_SCHEMA.md`.

---

## 7. API summary

- Envelope: `{ success, data|error, meta.requestId }`  
- Cookies: `gz_at`, `gz_rt`, `gz_csrf` (replace demo `mfx_at`)  
- Groups: Auth, Dashboard, Wallet, Deposits, Withdrawals, Performance, Trades, Notifications, Settings, Admin, Support, Reports, Contact  

Full detail: `API_DOCUMENTATION.md`.

---

## 8. Modules (backend)

| Module | Responsibility |
|--------|----------------|
| auth | Register, login, refresh, OAuth, admin 2FA |
| users | Profile, suspend, roles |
| wallet | Balances + ledger |
| deposits | Lifecycle + proofs |
| withdrawals | Lock / approve / pay |
| trading | Trades + trading days |
| daily-return | Preview + apply + reverse |
| notifications | In-app + prefs |
| email | Templates + SMTP |
| settings | Platform config |
| support | Tickets |
| reports | Aggregates + export |
| admin | Overview aggregations |

---

## 9. Security summary

- argon2id passwords  
- Short-lived JWT access + rotating hashed refresh  
- CSRF double-submit  
- Helmet, Zod, rate limits, RBAC, audit logs  
- Upload hardening  
- Ledger reconciliation  

Full detail: `SECURITY_PLAN.md`.

---

## 10. Money model (non-negotiable)

1. **Never use JS `number` for money.**  
2. JSON money = **string**.  
3. Round half-up to 2dp only at ledger write.  
4. Frontend **never** computes financial truth.  
5. Daily apply is **idempotent**.  
6. Admin actions are **audited**.  

---

## 11. Daily return (one paragraph)

Admin publishes trades for day D → previews distribution → applies with confirm phrase and Idempotency-Key → system selects eligible ACTIVE wallets, posts `PROFIT_DISTRIBUTION` ledger rows, updates projections, enqueues notifications/emails, writes audit. Locked withdrawal funds still earn. Reversal is SUPER_ADMIN-only via compensating entries.

Full detail: `DAILY_RETURN_ENGINE.md`.

---

## 12. Development order (compressed)

1. API bootstrap + Prisma schema  
2. Real authentication (replace demo)  
3. Wallet + ledger  
4. Deposits + withdrawals + uploads  
5. Trading desk publish  
6. **Daily return engine** (highest care)  
7. Notifications + email  
8. Admin UI wiring + reports  
9. Remove Placeholders; contact API  
10. Tests + staging + production gate  

Full detail: `PROJECT_ROADMAP.md`.

---

## 13. Deployment (target)

- VPS, Nginx TLS, PM2 cluster for API, Next standalone or Node server  
- Postgres managed or same VPS with backups  
- Mailhog → real SMTP  
- Sentry + uptime  
- Checklist: `docs/15-deployment-checklist.md`  

---

## 14. Brand & naming decisions

| Surface | Decision |
|---------|----------|
| Product name | **Growzy** |
| Legal entity | Growzy Capital Partners (legal/about only) |
| Cookies (production) | `gz_at`, `gz_rt`, `gz_csrf` |
| Package names | Keep `@meridian/*` short-term OR rename to `@growzy/*` in a dedicated PR |
| Legacy docs | Keep for depth; prefer this Master Plan for brand + order |

---

## 15. Explicit non-goals for the next coding session

- Do not redesign the frontend.  
- Do not implement money routes without tests.  
- Do not skip idempotency.  
- Do not put secrets in `NEXT_PUBLIC_*`.  
- Do not treat demo login as production security.

---

## 16. Future improvements (post-v1)

- Full KYC document workflow  
- Payment gateway automation  
- BullMQ/Redis for heavy fan-out  
- SSE for notifications  
- MT5/CSV trade import  
- Multi-currency  
- Mobile apps against same API  
- Telegram/WhatsApp channels  

---

## 17. Open decisions to resolve in week 1 of backend

| ID | Question | Default if undecided |
|----|----------|----------------------|
| D1 | Trade return aggregation (sum vs weighted) | Additive sum (`docs/12`) |
| D2 | Package rename now vs later | Later |
| D3 | Support tickets in v1? | Schema yes; UI after money path |
| D4 | Auth.js vs custom Express auth | Custom Express (docs) |
| D5 | Compliance doc owner | Block real money until assigned |

---

## 18. Definition of “backend MVP done”

- [ ] Investor can register, verify, login  
- [ ] Deposit approve credits ledger correctly  
- [ ] Withdraw lock/approve/reject correct  
- [ ] Daily return apply is idempotent under concurrency  
- [ ] Notifications + email for money events  
- [ ] Admin audit trail for all reviews  
- [ ] Dashboard Placeholders replaced for money paths  
- [ ] Staging deploy with backups  

---

## 19. Contact for this plan

This document supersedes informal chat decisions. Update it when an ADR changes D1–D5.  
Deep algorithms and endpoint field lists remain in the linked Phase 2 docs and `docs/*`.

---

**End of Master Project Plan.**  
Next action: begin Phase 1 of `PROJECT_ROADMAP.md` (API bootstrap) — **not** before the team has read §§1–12 of this file.
