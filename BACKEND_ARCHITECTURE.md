# Growzy — Backend Architecture

**Status:** Specification for Phase 2+ (no implementation in this document)  
**Aligns with:** `docs/01`, `docs/02`, `docs/11` (Meridian-era detail) · brand updated to Growzy  
**Stack:** Node 22 · Express 5 · TypeScript · PostgreSQL 16 · Prisma · Zod · Pino · node-cron · Nodemailer  

---

## 1. Goals

- Modular monolith (one deployable API) that can later extract workers without rewriting domain logic.
- Ledger-first money safety; wallets are projections.
- Shared Zod contracts with `@meridian/shared` (rename optional later).
- Same-origin cookies via Nginx (`/api` → API, `/` → Next).

---

## 2. Target folder structure

```
apps/api/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── server.ts                 # listen / graceful shutdown
│   ├── app.ts                    # express() + middleware chain
│   ├── config/                   # env (zod), constants
│   ├── lib/                      # prisma client, logger, clock, money, errors
│   ├── middleware/               # requestId, auth, authorize, csrf, validate, rateLimit, audit
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── wallet/               # wallet + ledger (ONLY module that writes LedgerEntry)
│   │   ├── deposits/
│   │   ├── withdrawals/
│   │   ├── trading/              # trades + trading days
│   │   ├── daily-return/         # preview + apply engine
│   │   ├── notifications/
│   │   ├── email/
│   │   ├── settings/
│   │   ├── referrals/            # feature-flagged
│   │   ├── support/              # tickets (v1.1 OK to stub)
│   │   ├── documents/            # KYC uploads (future)
│   │   ├── reports/
│   │   └── admin/                # thin aggregators / staff
│   ├── jobs/                     # cron registrations (instance 0 only)
│   ├── storage/                  # StorageProvider interface + local/S3
│   └── types/
└── package.json
```

**Dependency rule:** Controllers → Services → Prisma/Storage/Email.  
Modules must not import another module’s Prisma queries; they call that module’s public service API.

---

## 3. Layering

### 3.1 Controllers
- Parse HTTP only; no business rules.
- Call one service method.
- Map domain errors → HTTP envelope (`API_DOCUMENTATION.md`).

### 3.2 Services
- Transactions (`prisma.$transaction`).
- Idempotency keys.
- Emit `OutboxEvent` for side effects (email, notifications).

### 3.3 Validation
- Zod schemas in `packages/shared` (or `apps/api` until shared).
- `validate(schema)` middleware: body / query / params.
- Money fields as **strings**; parse with Decimal.js inside services.

### 3.4 Error handling
- Typed errors: `AppError { code, message, status, details? }`.
- Central error middleware: never leak stack traces; always `meta.requestId`.
- Unexpected → `INTERNAL_ERROR` + Pino error log.

### 3.5 Logging
- Pino JSON; `requestId` on every log line.
- Redact passwords, tokens, full card/crypto secrets.
- AuditLog is separate from application logs (see §10).

---

## 4. Authentication flow (target design)

> Do not implement in this prep phase. Spec only.

```
Register → email verification token → ACTIVE user + Wallet row
Login → argon2id verify → access JWT (15m) + refresh opaque (rotating)
Cookies: gz_at, gz_rt, gz_csrf (httpOnly where appropriate; CSRF readable)
Refresh reuse → revoke token family
Logout → revoke refresh + clear cookies
Google OAuth (PKCE) → link or create user
Admin: invite-only + mandatory 2FA (TOTP) in v1
```

**Access token claims (minimal):** `sub`, `role`, `sid` (session id), `ver` (token version).  
**Never trust role from request body.**

See `SECURITY_PLAN.md` and legacy `docs/08-authentication-flow.md`.

---

## 5. Authorization flow (RBAC)

| Role | Scope |
|------|--------|
| `USER` | Own resources only (wallet, deposits, withdrawals, notifications) |
| `ADMIN` | Review money, publish trades/days, apply daily return, broadcast, view audit |
| `SUPER_ADMIN` | + balance adjust, reverse return, settings, staff, export audit |

Middleware: `authenticate` → `authorize(...roles)` → ownership checks in services (`WHERE userId = ctx.userId`).

Non-admin hitting admin UI: frontend shows 404; API returns 403/404 consistently (prefer 404 for user enumeration on admin paths — match `docs/08`).

---

## 6. Database architecture

- PostgreSQL 16; Prisma migrations only.
- Monetary: `Decimal(20,8)`; display round half-up to 2dp at ledger boundary.
- Ledger append-only; DB triggers block UPDATE/DELETE on `ledger_entries`.
- See `DATABASE_SCHEMA.md`.

---

## 7. Service layer (module map)

| Module | Owns | Must not |
|--------|------|----------|
| `wallet` | Wallet projection, LedgerEntry writes | Send email directly (use outbox) |
| `deposits` | Deposit lifecycle, proof metadata | Credit wallet except via wallet service |
| `withdrawals` | Lock / approve / reject / paid | Unlock except via wallet service |
| `daily-return` | Preview + apply orchestration | Mutate wallet except via wallet service |
| `trading` | Trade + TradingDay state machine | Apply profits |
| `notifications` | In-app rows + preferences | Block money txns |
| `email` | Template render + SMTP send | Decide business eligibility |
| `settings` | Key/value platform config | Cache forever without invalidation |
| `auth` | Sessions, tokens, passwords | Touch ledger |

---

## 8. Controller layer conventions

```
POST   /api/v1/...     create
GET    /api/v1/...     read / list
PATCH  /api/v1/...     partial update
POST   /api/v1/.../:id/actions/:name   explicit state transitions (approve, reject, apply)
```

Money mutations require `Idempotency-Key` header.

---

## 9. Cron jobs

Run **only** when `NODE_APP_INSTANCE === '0'` (PM2 cluster).

| Job | Schedule (default) | Purpose |
|-----|--------------------|---------|
| Outbox poll | every 10s | Deliver notifications/emails |
| Session cleanup | daily | Purge expired refresh tokens |
| Daily digest | setting hour | Optional summary email |
| Monthly statement | 1st 06:00 UTC | PDF/CSV generation stub |
| Reconciliation | hourly | Sum ledger vs wallet; alert on drift |

BullMQ + Redis: defer until fan-out >30s or multi-instance requires it. Until then: cron + outbox.

---

## 10. Email service

- Nodemailer transport from env.
- React Email templates (15+ listed in `docs/13`).
- All sends via outbox (`EMAIL_SEND` events).
- Dev: Mailhog / Ethereal.
- Never log full HTML with tokens in plaintext logs.

---

## 11. Notification service

```
domain event → OutboxEvent → worker → Notification (IN_APP) + Email (if preferred)
```

Security / money events cannot be disabled by user prefs.

---

## 12. Audit logs

Every admin state change writes `AuditLog`:

- `actorId`, `action`, `entityType`, `entityId`
- `before` / `after` JSON snapshots
- `ip`, `userAgent`, `requestId`, `createdAt`

Immutable from app layer (no update/delete APIs).

---

## 13. File upload architecture

```
Client → multipart → validate magic bytes → StorageProvider.put(key)
→ store key on Deposit.proofKey / Document.key → serve via authenticated GET
```

- Max 5MB; jpeg/png/webp/pdf; no SVG.
- Strip EXIF; re-encode images where possible.
- Files **not** in public web root.
- Local disk v1; S3-compatible later behind same interface.

---

## 14. Security middleware order

Exact order (do not reorder casually):

1. `requestId`
2. `helmet`
3. `cors` (allowlist)
4. `rateLimit` (global)
5. `json` / `multipart`
6. `cookieParser`
7. Route-specific `rateLimit`
8. `authenticate` (optional/required)
9. `authorize`
10. `csrf` (cookie auth mutations)
11. `validate(schema)`
12. Controller
13. `audit` (admin mutations)
14. Error handler

---

## 15. Configuration

All secrets via env (validated with Zod at boot). No secrets in Next public env except site URL / platform name / support email / feature flags.

---

## 16. What not to do in Phase 2 day 1

- Do not mount unfinished money routes without ledger tests.
- Do not let controllers call `prisma.ledgerEntry.create` outside wallet module.
- Do not use JS `number` for balances.
- Do not skip idempotency on deposit/withdraw/apply.
