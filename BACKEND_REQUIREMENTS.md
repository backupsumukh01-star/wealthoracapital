# Growzy — Backend Requirements

Complete backend contract derived from the existing frontend, shared package, and schema docs.  
**Status today:** `apps/api` is scaffold-only; this document defines what must be built.  

> **Final frontend pass (Admin OS v4):** Backend must also expose System Health probes, global search indexes, activity feed aggregation, platform CMS (`platformCms`), feature flags (incl. kyc/reports/notifications/email), role permission matrix, backup jobs, and audit export — matching the new admin surfaces. See `FINAL_PROJECT_AUDIT.md`.

---

## 1. Goals

1. Replace demo localStorage stores with authoritative APIs  
2. Preserve existing route IA and DTO shapes in `@meridian/shared`  
3. Enforce ledger-first money, RBAC, audit, and CMS publish semantics  
4. Support public CMS bootstrap for marketing SSR/hydrate  

---

## 2. Technical baseline

| Concern | Requirement |
|---------|-------------|
| Runtime | Node 22+, Express modular monolith (`apps/api`) |
| DB | PostgreSQL 16 |
| ORM | Prisma (models currently empty — implement per this doc + `DATABASE_SCHEMA.md`) |
| Money | `DECIMAL(20,8)` in DB · `MoneyString` in JSON |
| IDs | UUID v4 |
| Time | `TIMESTAMPTZ` UTC |
| Auth | HttpOnly cookies or JWT access + refresh; separate admin realm recommended |
| Files | Private object storage + signed URLs |
| Email | Queue + ESP; templates keyed by string |
| Idempotency | Required on deposit, withdraw, return distribute, wallet adjust |

Shared path constants already exist in `API_ROUTES` (`packages/shared`). Extend as listed below for CMS/admin gaps.

---

## 3. Every user flow (investor)

### 3.1 Register

**UI:** `/register`, marketing `AuthModal`  
**Steps:** collect name/email/password → create user `PENDING_VERIFICATION` → send verify email → redirect to `/verify-email/sent`  
**APIs:** `POST /auth/register` → `POST /auth/verify-email/resend`  
**Entities:** `User`, `EmailLog`, `VerificationToken`

### 3.2 Verify email

**UI:** `/verify-email`  
**Steps:** submit OTP → mark `email_verified_at` → session → `/onboarding`  
**APIs:** `POST /auth/verify-email`  
**Entities:** `User`, `Session`

### 3.3 Login / logout / sessions

**UI:** `/login`  
**Steps:** credentials (+ optional 2FA) → session cookie → `/dashboard`  
**APIs:** `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`, `GET/DELETE /auth/sessions`  
**Entities:** `User`, `Session` / `RefreshToken`

### 3.4 Password reset

**UI:** `/forgot-password` → `/reset-password`  
**APIs:** `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/change-password`  
**Entities:** `VerificationToken`, `EmailLog`, `AuditLog`

### 3.5 OAuth (optional v1)

**UI:** `/oauth/callback`  
**APIs:** `GET /auth/google` (+ callback)  
**Entities:** `OAuthAccount`, `User`

### 3.6 KYC onboarding

**UI:** `/onboarding`  
**Steps:** upload ID/selfie → status `PENDING` → wait for admin → `APPROVED` unlocks deposits  
**APIs:**  
- `POST /kyc/documents` (multipart / signed upload)  
- `GET /kyc/status`  
**Entities:** `Document` / KYC submission, `User.kycStatus`

### 3.7 Dashboard home

**UI:** `/dashboard`  
**APIs:** `GET /auth/me`, `GET /wallet/summary`, `GET /performance/summary`, `GET /trades?limit=`, `GET /notifications/unread-count`  
**Entities:** `Wallet`, `Trade`, `ProfitDistribution`, `Notification`

### 3.8 Deposit

**UI:** `/wallet?action=deposit`  
**Steps:** choose payment method → amount → upload proof → `PENDING` → admin approve → ledger credit  
**APIs:**  
- `GET /deposits/methods`  
- `POST /deposits` (idempotency key)  
- `POST /deposits/:id/proof`  
- `GET /deposits`  
**Entities:** `PaymentMethod`, `Deposit`, `LedgerEntry`, `Wallet`, `Notification`, `EmailLog`

### 3.9 Withdraw

**UI:** `/wallet?action=withdraw`  
**Steps:** select payout method → amount → lock funds → admin review → paid / reject+unlock  
**APIs:**  
- `GET /withdrawals/limits`  
- `GET /settings/payout-methods` (investor)  
- `POST /withdrawals`  
- `GET /withdrawals`  
**Entities:** `PayoutMethod`, `Withdrawal`, `LedgerEntry`, `Wallet`

### 3.10 Daily returns (investor receive)

**Trigger:** admin completes return run  
**Effect:** credit each eligible wallet; notify; email optional  
**Investor APIs:** `GET /performance/summary`, `GET /performance/series`, `GET /wallet/transactions`  
**Entities:** `DailyReturnRun`, `ProfitDistribution`, `LedgerEntry`, `TradingDay`

### 3.11 Trades & performance

**UI:** `/trades`, `/trades/[id]`, `/my-performance`  
**APIs:** `GET /trades`, `GET /trades/:id`, `GET /trades/stats`, `GET /performance/*`  
**Entities:** `Trade`, `TradingDay`, `EquityPoint` (derived or stored series)

### 3.12 Transactions timeline

**UI:** `/transactions`  
**API:** `GET /wallet/transactions` (ledger view — no separate transactions table)  
**Entities:** `LedgerEntry`

### 3.13 Notifications

**UI:** `/notifications`  
**APIs:** `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `GET /notifications/unread-count`  
**Entities:** `Notification`, `NotificationPreference`

### 3.14 Support

**UI:** `/support`  
**APIs:** `GET/POST /support/tickets`, `POST /support/tickets/:id/messages`, attachments upload  
**Entities:** `SupportTicket`, `SupportMessage`

### 3.15 Settings

**UI:** `/settings/*`  
**APIs:** profile update, payout CRUD, preferences, 2FA enable/disable, email-change with OTP  
**Entities:** `User`, `PayoutMethod`, `NotificationPreference`

### 3.16 Referrals (v1.1)

**UI:** `/referrals`  
**APIs:** `GET /referrals/me`, attribution on register  
**Entities:** `ReferralAttribution`  
**Flag:** `REFERRALS_ENABLED`

### 3.17 Marketing content consumption

**UI:** public site  
**API:** `GET /cms/public/bootstrap` (published landing, ticker, FAQs, testimonials, announcements, SEO, performance public, report docs)  
**Entities:** CMS tables (below)

---

## 4. Every admin flow

### 4.1 Admin login

**UI:** `/admin/login`  
**APIs:** `POST /admin/auth/login` (+ OTP), `POST /admin/auth/logout`, `GET /admin/auth/me`  
**RBAC:** role on `User` or staff role assignment  
**Entities:** `User` (ADMIN+), `Session`, `AuditLog`

### 4.2 Overview analytics

**UI:** `/admin`  
**API:** `GET /admin/analytics/overview`  
**Sources:** counts of pending KYC/deposits/withdrawals, AUM, visitors (optional analytics)

### 4.3 KYC review

**UI:** `/admin/kyc`, `/admin/kyc/[userId]`  
**Steps:** open docs → approve/reject with reason → email + notify investor  
**APIs:** `GET /admin/kyc`, `GET /admin/kyc/:userId`, `POST /admin/kyc/:userId/approve|reject`  
**Entities:** `User`, KYC docs, `EmailLog`, `AuditLog`

### 4.4 Deposit review

**UI:** `/admin/deposits`, detail  
**Steps:** verify proof → approve (ledger credit) or reject  
**APIs:** `GET /admin/deposits`, `GET /admin/deposits/:id`, `POST …/approve|reject`  
**Entities:** `Deposit`, `LedgerEntry`, `Wallet`, `AuditLog`

### 4.5 Withdrawal review

**UI:** `/admin/withdrawals`, detail  
**Steps:** approve → mark paid with external ref, or reject → unlock  
**APIs:** `GET /admin/withdrawals`, `POST …/approve|reject|mark-paid`  
**Entities:** `Withdrawal`, `LedgerEntry`, `Wallet`, `AuditLog`

### 4.6 User 360

**UI:** `/admin/users`, `/admin/users/[id]`  
**APIs:** search/filter users, timeline, notes, suspend/reactivate, force logout  
**Entities:** `User`, notes, sessions, related money objects

### 4.7 Wallet adjustments

**UI:** `/admin/wallets`  
**APIs:** `POST /admin/wallets/:userId/adjust` (credit/debit/freeze) with reason + idempotency  
**Entities:** `LedgerEntry` (`ADJUSTMENT_*`), `Wallet`, `AuditLog`

### 4.8 Trade desk publish

**UI:** `/admin/trades`, new, detail  
**Steps:** create trade → draft → publish (visible marketing + investor)  
**APIs:** CRUD `/admin/trades`, `POST /admin/trades/:id/publish`  
**Entities:** `Trade`, `TradingDay`, `AuditLog`

### 4.9 Daily return engine

**UI:** `/admin/daily-return`, run detail  
**Steps:** select day → set % → preview eligible wallets → process → complete / reverse  
**APIs:**  
- `GET/POST /admin/daily-returns`  
- `POST /admin/daily-returns/:id/preview`  
- `POST /admin/daily-returns/:id/process`  
- `POST /admin/daily-returns/:id/reverse`  
**Entities:** `TradingDay`, `DailyReturnRun`, `ProfitDistribution`, `LedgerEntry`  
**Rules:** one completed run per trading day; idempotent process; rounding delta tracked

### 4.10 Performance CMS

**UI:** `/admin/performance`  
**APIs:** `GET/PUT /admin/cms/performance`, `POST …/publish`  
**Entities:** `CmsPerformanceSnapshot` (or `settings` JSON + published flag)

### 4.11 Ticker CMS

**UI:** `/admin/ticker`  
**APIs:** `GET/PUT /admin/cms/ticker`, `PUT /admin/cms/ticker/display`  
**Entities:** `CmsTickerPair`, `CmsTickerDisplay`

### 4.12 Landing / content CMS

**UI:** `/admin/cms/landing`, `/admin/cms/content`  
**APIs:**  
- `GET/PUT /admin/cms/landing` (draft)  
- `POST /admin/cms/landing/publish`  
- `GET/PUT /admin/cms/pages/:slug`  
- CRUD FAQs, testimonials  
- `GET /admin/cms/revisions?module=`  
**Entities:** `CmsLanding`, `CmsPage`, `CmsFaq`, `CmsTestimonial`, `CmsRevision`

### 4.13 Media manager

**UI:** `/admin/cms/media`  
**APIs:** `POST /admin/uploads` (signed), CRUD `/admin/cms/media`  
**Entities:** `CmsMediaAsset`

### 4.14 Site SEO / maintenance

**UI:** `/admin/cms/site`  
**APIs:** `GET/PUT /admin/cms/site-seo`  
**Entities:** `CmsSiteSeo` (or settings keys)  
**Effect:** maintenance blocks money APIs + shows overlay

### 4.15 Report library

**UI:** `/admin/report-library`  
**APIs:** CRUD + publish `/admin/cms/reports`; public list on bootstrap  
**Entities:** `CmsReportDoc`

### 4.16 Live activity & announcements

**UI:** `/admin/activity`, `/admin/announcements`  
**APIs:** `PUT /admin/cms/activity`, CRUD announcements + publish/archive  
**Entities:** `CmsActivityConfig`, `CmsAnnouncement`

### 4.17 Backup export

**UI:** `/admin/cms/backup`  
**APIs:** `POST /admin/cms/backup` (JSON/CSV scopes), optional restore (super-admin)  
**Entities:** read models across CMS + settings

### 4.18 Email templates & outbox

**UI:** `/admin/email-templates`, `/admin/emails`  
**APIs:** `GET/PUT /admin/email-templates/:key`, `POST /admin/emails/send`, `GET /admin/emails/outbox`  
**Entities:** `EmailTemplate`, `EmailLog`

### 4.19 Notifications / broadcast

**UI:** `/admin/notifications`, `/admin/broadcast`  
**APIs:** create campaign → send to audience segments  
**Entities:** `NotificationCampaign`, `Notification`

### 4.20 Support desk

**UI:** `/admin/support`  
**APIs:** list/assign/reply/close/priority/category/attachments/internal notes  
**Entities:** `SupportTicket`, `SupportMessage`, `AuditLog`

### 4.21 Feature toggles & global settings

**UI:** `/admin/feature-toggles`, `/admin/settings/*`  
**APIs:** `GET/PUT /admin/settings`, `GET/PUT /admin/feature-toggles`  
**Entities:** `Setting` (key/value JSONB)

### 4.22 Payment methods (rails)

**UI:** `/admin/settings/payment-methods`  
**APIs:** CRUD INR/crypto rails for deposits  
**Entities:** `PaymentMethod`

### 4.23 Roles & staff

**UI:** `/admin/settings/roles`, `/admin/settings/staff`  
**APIs:** list roles/permissions, invite staff, assign role  
**Entities:** `User.role` / `AdminRoleAssignment`, `AdminInvite`  
**Prepared roles:** Super Admin, Finance, Support, KYC, Trading Manager, Content Manager, Viewer

### 4.24 Audit log

**UI:** `/admin/audit-log`  
**API:** `GET /admin/audit` (filter by actor, action, entity, date)  
**Entities:** `AuditLog` (immutable)

### 4.25 Ops reports export

**UI:** `/admin/reports`  
**APIs:** CSV/Excel export endpoints for users, deposits, withdrawals, ledger  
**Entities:** query projections

---

## 5. Future API endpoints (complete checklist)

### 5.1 Already declared in `API_ROUTES`

```
/auth/register|login|logout|refresh|me
/auth/verify-email|verify-email/resend
/auth/forgot-password|reset-password|change-password
/auth/google|sessions
/wallet| /wallet/summary| /wallet/transactions
/deposits| /deposits/methods
/withdrawals| /withdrawals/limits
/trades| /trades/pairs| /trades/stats
/performance/summary|series|monthly|yearly|distributions|public
/notifications| /notifications/unread-count
/settings/public
```

### 5.2 Required additions (investor)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/deposits/:id/proof` | Upload payment proof |
| GET | `/kyc/status` | Investor KYC state |
| POST | `/kyc/documents` | Submit KYC files |
| GET/POST/PATCH/DELETE | `/payout-methods` | Saved withdrawal destinations |
| GET/PATCH | `/settings/preferences` | Notification/theme prefs |
| GET/POST | `/support/tickets` | Investor support |
| POST | `/support/tickets/:id/messages` | Reply |
| GET | `/cms/public/bootstrap` | Published marketing payload |
| GET | `/cms/public/reports` | Published downloadable reports |
| GET | `/referrals/me` | Referral dashboard (v1.1) |

### 5.3 Required admin / CMS APIs

| Area | Endpoints |
|------|-----------|
| Admin auth | `/admin/auth/login`, `/logout`, `/me` |
| Analytics | `GET /admin/analytics/overview` |
| Users | `GET /admin/users`, `GET/PATCH /admin/users/:id`, suspend, notes, timeline |
| KYC | `GET /admin/kyc`, approve/reject |
| Deposits | queue + approve/reject |
| Withdrawals | queue + approve/reject/mark-paid |
| Wallets | adjust / freeze |
| Trades | CRUD + publish |
| Daily returns | create/preview/process/reverse |
| CMS landing | GET/PUT draft, POST publish, revisions |
| CMS pages/FAQ/testimonials | CRUD |
| CMS media | CRUD + upload sign |
| CMS ticker | pairs + display |
| CMS performance | PUT + publish |
| CMS announcements/activity | CRUD / PUT |
| CMS site-seo | GET/PUT |
| CMS reports | CRUD + publish |
| CMS backup | POST export (/restore optional) |
| Email templates | GET/PUT by key |
| Emails | send + outbox |
| Notifications campaigns | CRUD + send |
| Support | assign/reply/close/notes |
| Settings / toggles | GET/PUT |
| Payment methods | admin CRUD |
| Roles / staff | GET/PUT, invites |
| Audit | GET filtered |
| Uploads | `POST /admin/uploads` signed URL |

All mutating admin endpoints must write `AuditLog` with actor, IP, user-agent, before/after.

---

## 6. Every database entity

Aligned with `DATABASE_SCHEMA.md` + CMS extensions implied by Admin OS.

### 6.1 Core identity & money

| Entity | Purpose |
|--------|---------|
| **User** | Investor or staff identity, role, status, KYC status |
| **Session / RefreshToken** | Auth sessions |
| **OAuthAccount** | Social login links |
| **VerificationToken** | Email verify / password reset / invites |
| **Wallet** | Denormalised balances (cache) |
| **LedgerEntry** | Append-only money truth |
| **PaymentMethod** | Platform deposit rails (UPI/bank/crypto) |
| **Deposit** | Funding requests + proof metadata |
| **PayoutMethod** | Investor withdrawal destinations |
| **Withdrawal** | Payout requests + status machine |

### 6.2 Trading & returns

| Entity | Purpose |
|--------|---------|
| **TradingDay** | Calendar trading day + publish state |
| **Trade** | Desk trade rows (public when published) |
| **DailyReturnRun** | Distribution job for a day |
| **ProfitDistribution** | Per-user return line → ledger |

### 6.3 Communications & support

| Entity | Purpose |
|--------|---------|
| **Notification** | In-app messages |
| **NotificationPreference** | Channel/type toggles |
| **NotificationCampaign** | Admin broadcast jobs |
| **EmailTemplate** | Editable HTML/subject by key |
| **EmailLog** | Send attempts |
| **SupportTicket** | Ticket header |
| **SupportMessage** | Thread + internal notes |
| **Broadcast** (optional) | Alias of campaign |

### 6.4 Platform

| Entity | Purpose |
|--------|---------|
| **Setting** | Key/value JSON platform config |
| **AuditLog** | Immutable admin actions |
| **OutboxEvent** | Reliable async side-effects (optional) |
| **Document** | KYC / proof file metadata |
| **ReferralAttribution** | v1.1 referrals |
| **AdminInvite** | Staff invite tokens (optional) |

### 6.5 CMS (required for current frontend)

| Entity | Purpose |
|--------|---------|
| **CmsLanding** | Published + draft homepage payload |
| **CmsRevision** | Save history snapshots |
| **CmsPage** | about/terms/privacy/contact/footer bodies |
| **CmsFaq** | FAQ items |
| **CmsTestimonial** | Investor quotes |
| **CmsTickerPair** | Market tape pairs |
| **CmsTickerDisplay** | Speed, colours, direction, enable |
| **CmsPerformance** | Monthly/yearly/KPI snapshot |
| **CmsAnnouncement** | Banners/popups |
| **CmsActivityConfig** | Social-proof rotation |
| **CmsMediaAsset** | Media library |
| **CmsReportDoc** | Downloadable statements |
| **CmsSiteSeo** | Meta, favicon, GA, Pixel, maintenance |

*(These may be tables or JSON documents versioned with publish flags; either is fine if APIs match frontend needs.)*

### 6.6 Entity relationship sketch

```
User ─┬─ Wallet ── LedgerEntry
      ├─ Deposit / Withdrawal / PayoutMethod
      ├─ Notification*
      ├─ SupportTicket ── SupportMessage
      └─ Document (KYC)

TradingDay ── Trade
     └── DailyReturnRun ── ProfitDistribution ── LedgerEntry

CmsLanding / Cms* ── CmsRevision
Setting · AuditLog · EmailTemplate · EmailLog · PaymentMethod
```

### 6.7 Shared DTO entities (already typed)

From `packages/shared` `entities.ts` (API response shapes):

`User`, `Wallet`, `LedgerEntry`, `PaymentMethod`, `Deposit`, `PayoutMethod`, `Withdrawal`, `Trade`, `TradingDay`, `ProfitDistribution`, `DailyReturnRun`, `Notification`, `EquityPoint`, `PerformanceSummary`, `WalletSummary`, `SessionInfo`, `AuditLogEntry`

Enums: roles, user/KYC/deposit/withdrawal statuses, ledger types, trade direction/outcome, return run status, notification types, etc.

---

## 7. Email template keys to implement

Premium keys used by admin template manager:

`welcome`, `verify`, `login_alert`, `password_reset`, `password_changed`, `kyc_started`, `kyc_approved`, `kyc_rejected`, `deposit_pending`, `deposit_approved`, `withdrawal_pending`, `withdrawal_approved`, `daily_return`, `weekly_performance`, `monthly_statement`, `trade_published`, `announcement`, `maintenance`, `referral_bonus`, `support_reply`, `account_suspended`, `account_reactivated`, `twofa_enabled`, `email_changed`, `profile_updated`

---

## 8. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Consistency | Wallet updates only via ledger posts in a DB transaction |
| Concurrency | Optimistic lock on `Wallet.version` |
| Audit | Every admin money/CMS publish action logged |
| Observability | Request IDs, structured logs, metrics on return runs |
| Rate limits | Auth, OTP, deposit create, contact form |
| Backups | DB + object storage; CMS export is operational convenience only |
| Compliance | Soft-close users; retain ledger; risk disclosures stay public |

---

## 9. Migration path from demo frontend

1. Implement auth + `/auth/me` → wire `SessionProvider`  
2. Wallet/deposits/withdrawals → replace lifecycle money mutations  
3. Admin queues → replace lifecycle admin actions  
4. Daily return engine → replace demo distribution  
5. CMS bootstrap + admin CMS APIs → replace `growzy_admin_os_v3`  
6. Remove localStorage stores behind feature flag once parity verified  

Frontend providers are already the swap points; keep DTO compatibility with `@meridian/shared`.

---

## 10. Related documents

| File | Use |
|------|-----|
| `SYSTEM_ARCHITECTURE.md` | System context |
| `PROJECT_STRUCTURE.md` | Pages & modules |
| `FRONTEND_COMPONENT_MAP.md` | UI wiring |
| `DATABASE_SCHEMA.md` | Column-level schema |
| `CMS_COMPLETION_REPORT.md` | CMS surface checklist |
| `docs/05-api-structure.md` | Earlier API outline |
| `docs/11-backend-modules.md` | Module boundaries |
| `docs/12-trading-engine.md` | Return engine detail |
