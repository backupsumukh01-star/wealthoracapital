# Growzy — Documentation Index

> **Product brand:** Growzy (repo/package codename may still say `meridian-fx` / `@meridian/*`)  
> **Phase 2 source of truth:** [`../MASTER_PROJECT_PLAN.md`](../MASTER_PROJECT_PLAN.md)  
> **Status:** Backend Phases 1–3 implemented (auth, users/admin, KYC). Planning docs below remain the deep specs; live API docs are `API_PHASE*.md` / `DATABASE_PHASE*.md` / `KYC_FLOW.md`.

This folder contains the complete architecture and planning set for a premium,
AI-assisted Forex investment platform. Read the documents in order the first time;
after that, use this page as a jump table.

---

## Reading order

| # | Document | What it answers |
|---|----------|-----------------|
| 00 | [Project Overview](./00-project-overview.md) | What we are building, who uses it, the money model, non-negotiable principles |
| 01 | [Folder Structure](./01-folder-structure.md) | The complete monorepo tree, file by file |
| 02 | [Project Architecture](./02-project-architecture.md) | Layering rules, module boundaries, naming conventions, dependency direction |
| 03 | [Development Roadmap](./03-development-roadmap.md) | Phases, milestones, deliverables, exit criteria |
| 04 | [Database Schema](./04-database-schema.md) | Entities, relations, Prisma models, indexes, the ledger design |
| 05 | [API Structure](./05-api-structure.md) | Every endpoint, request/response shape, error envelope, versioning |
| 06 | [User Flow](./06-user-flow.md) | End-to-end journeys for the investor |
| 07 | [Admin Flow](./07-admin-flow.md) | End-to-end journeys for the operator |
| 08 | [Authentication Flow](./08-authentication-flow.md) | Register, login, Google OAuth, verification, reset, token lifecycle |
| 09 | [UI Page List](./09-ui-pages.md) | Every route, its sections, states and components |
| 10 | [Design System](./10-design-system.md) | Tokens, typography, motion language, component inventory |
| 11 | [Backend Modules](./11-backend-modules.md) | Each server module, its responsibility and public surface |
| 12 | [Trading & Daily Return Engine](./12-trading-engine.md) | The core distribution algorithm, idempotency, reversal |
| 13 | [Notifications](./13-notifications.md) | Channel abstraction, templates, in-app + email, future Telegram/WhatsApp |
| 14 | [Security Checklist](./14-security-checklist.md) | Threats, controls, verification steps |
| 15 | [Deployment Checklist](./15-deployment-checklist.md) | VPS, Nginx, PM2, backups, monitoring, go-live gate |

---

## The ten things that matter most

If you only remember ten decisions from this documentation set, make it these.

1. **Money is never a float.** All monetary values are `Decimal(20, 8)` in Postgres and
   `Decimal.js` in application code. No `number` arithmetic touches a balance, ever.
2. **The ledger is the truth; the wallet balance is a cache.** Every balance change writes an
   immutable `LedgerEntry`. `Wallet.balance` is a denormalised projection that must always be
   reconstructable by summing the ledger.
3. **Daily return application is idempotent.** Running it twice for the same trading day is a
   no-op, enforced by a unique constraint, not by hope.
4. **Admin actions are audited.** Every state-changing admin operation writes an `AuditLog` row
   with actor, target, before/after snapshot and IP.
5. **Authentication uses short-lived access tokens plus rotating refresh tokens** stored hashed,
   delivered as `httpOnly` cookies. Refresh reuse detection revokes the whole family.
6. **Storage is behind an interface.** `StorageProvider` has a local-disk implementation today and
   an S3 implementation later. Application code never touches `fs` directly.
7. **Every input is validated at the edge with Zod**, and the same schemas are shared with the
   frontend through the `@meridian/shared` package.
8. **The frontend never computes financial truth.** It renders what the API returns. Charts,
   ROI and totals are server-derived.
9. **The design is original.** We study premium fintech products (FundedNext, Deel, Ramp, Linear)
   for *quality bar* — spacing rhythm, motion restraint, typographic hierarchy — and take
   nothing else. No copied markup, assets, copy, colour palettes or layout.
10. **This is not a licensed brokerage product out of the box.** Regulatory posture, custody of
    client funds and jurisdiction must be resolved by the operator before accepting real money.
    See the compliance note in the [Project Overview](./00-project-overview.md#8-compliance-posture).

---

## Live backend docs (Phases 1–3)

| Doc | Topic |
|-----|--------|
| [API Phase 1](./API_PHASE1.md) | Auth |
| [API Phase 2](./API_PHASE2.md) | Profile / admin / audit |
| [API Phase 3 KYC](./API_PHASE3_KYC.md) | Investor + admin KYC APIs |
| [API Phase 4 Finance](./API_PHASE4_FINANCE.md) | Wallet, deposits, withdrawals, admin finance |
| [API Phase 5 Trading](./API_PHASE5_TRADING.md) | Trades, returns, performance |
| [Database Phase 3 KYC](./DATABASE_PHASE3_KYC.md) | KYC schema |
| [Database Phase 4 Finance](./DATABASE_PHASE4_FINANCE.md) | Finance schema |
| [Financial Architecture](./FINANCIAL_ARCHITECTURE.md) | Money principles + module map |
| [Ledger](./LEDGER.md) | Double-entry posting rules |
| [Trading Architecture](./TRADING_ARCHITECTURE.md) | Trades + daily return engine |
| [Performance Engine](./PERFORMANCE_ENGINE.md) | Portfolio + analytics |
| [Distribution Engine](./DISTRIBUTION_ENGINE.md) | Profit distribution rules |
| [KYC Flow](./KYC_FLOW.md) | End-to-end verification flow |
| [Backend setup](./BACKEND_SETUP.md) | Local API + Postgres |

---

## Document conventions

- **MUST / SHOULD / MAY** follow RFC 2119 meaning.
- Code blocks in these documents are *specifications*, not implementations. They describe the
  shape of the thing to be built.
- `TODO(owner)` marks a decision that is deliberately deferred and needs a human answer.
- Currency is USD throughout v1. Multi-currency is explicitly out of scope and noted where it
  would require schema change.
