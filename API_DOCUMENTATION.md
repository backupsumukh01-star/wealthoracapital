# Growzy — REST API Documentation

**Status:** Contract / specification only — **no implementation**  
**Base URL:** `https://{host}/api/v1`  
**Protocol:** HTTPS · JSON (`application/json`) unless noted (multipart uploads)  
**Money & percents:** JSON **strings** (never IEEE floats) — e.g. `"1250.75"`, `"0.700000"`  
**Timestamps:** ISO 8601 UTC  
**IDs:** UUID v4 strings  

> **Final frontend pass endpoints to prioritize:** `GET /admin/health`, `GET /admin/search?q=`, `GET /admin/activity`, `GET|PUT /admin/cms/platform`, `POST /admin/cms/platform/publish`, `POST /admin/cms/revisions/:id/rollback`, `GET|PUT /admin/settings/feature-flags`, `GET|PUT /admin/settings/roles`, `GET /admin/audit` (export), `POST /admin/backups`, `GET /admin/reports/export`.

Aligned with `@meridian/shared` envelopes, `ERROR_CODES`, `DATABASE_SCHEMA.md`, and `BACKEND_REQUIREMENTS.md`.

---

## Table of contents

1. [Authentication & sessions](#1-authentication--sessions)  
2. [Conventions](#2-conventions)  
3. [Error codes](#3-error-codes)  
4. [Pagination, sorting, filtering](#4-pagination-sorting-filtering)  
5. [Rate limits](#5-rate-limits)  
6. [Permissions / RBAC](#6-permissions--rbac)  
7. [Public & CMS](#7-public--cms)  
8. [Investor auth](#8-investor-auth)  
9. [Investor profile & settings](#9-investor-profile--settings)  
10. [KYC](#10-kyc)  
11. [Wallet](#11-wallet)  
12. [Deposits](#12-deposits)  
13. [Withdrawals & payout methods](#13-withdrawals--payout-methods)  
14. [Performance & trades (investor/public)](#14-performance--trades-investorpublic)  
15. [Notifications](#15-notifications)  
16. [Support (investor)](#16-support-investor)  
17. [Referrals](#17-referrals)  
18. [Contact](#18-contact)  
19. [Admin authentication](#19-admin-authentication)  
20. [Admin operations](#20-admin-operations)  
21. [Admin trading & daily returns](#21-admin-trading--daily-returns)  
22. [Admin CMS](#22-admin-cms)  
23. [Admin communications](#23-admin-communications)  
24. [Admin settings, roles, audit, reports](#24-admin-settings-roles-audit-reports)  
25. [Uploads](#25-uploads)  
26. [Health](#26-health)  
27. [WebSocket endpoints (future)](#27-websocket-endpoints-future)  
28. [Idempotency](#28-idempotency)  

---

## 1. Authentication & sessions

### Investor

| Mechanism | Detail |
|-----------|--------|
| Access cookie | `gz_at` (HttpOnly, Secure, SameSite=Lax) — short-lived |
| Refresh cookie | `gz_rt` (HttpOnly, Secure, SameSite=Strict) — rotating |
| Alternate | `Authorization: Bearer <accessToken>` for non-browser clients |
| CSRF | Double-submit cookie `gz_csrf` required on cookie-based state-changing requests; header `X-CSRF-Token` |
| Email verified gate | Endpoints marked ✅ require `emailVerified` |
| KYC gate | Deposits/withdrawals may require `kycStatus = APPROVED` (configurable) |

### Admin

| Mechanism | Detail |
|-----------|--------|
| Separate cookie realm | `gz_admin_at` / `gz_admin_rt` (or path-scoped cookies under `/api/v1/admin`) |
| 2FA | Required for SUPER_ADMIN; optional/enforced for other staff via settings |
| Login surface | `/admin/auth/*` — never reuse investor cookies for admin mutations |

### Auth legend (used below)

| Symbol | Meaning |
|--------|---------|
| 🔓 | Public |
| 🔒 | Authenticated investor session |
| ✅ | Email verified |
| 🪪 | KYC approved (when feature enabled) |
| 🛡 | Admin session (`ADMIN` or staff role) |
| 👑 | Super Admin |
| 👁 | Viewer (read-only admin) |

---

## 2. Conventions

### Success envelope

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_…",
    "timestamp": "2026-08-03T12:00:00.000Z"
  }
}
```

### Paginated envelope

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true
  },
  "meta": { "requestId": "req_…", "timestamp": "…" }
}
```

### Error envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-safe message",
    "details": { "fields": { "amount": ["Must be greater than zero"] } }
  },
  "meta": { "requestId": "req_…", "timestamp": "…" }
}
```

Clients **branch on `error.code`**, never on message prose.

### Headers

| Header | When |
|--------|------|
| `Content-Type: application/json` | JSON bodies |
| `Idempotency-Key: <uuid>` | Required on money-creating POSTs |
| `X-CSRF-Token` | Cookie-session mutating requests |
| `X-Request-Id` | Optional client correlation (echoed in meta) |
| `Accept: text/csv` / `application/vnd.openxmlformats…` | Export endpoints |

---

## 3. Error codes

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 422 | Schema / field validation failed |
| `UNAUTHENTICATED` | 401 | Missing or invalid session |
| `TOKEN_EXPIRED` | 401 | Access token expired; refresh required |
| `FORBIDDEN` | 403 | Authenticated but lacks permission |
| `EMAIL_NOT_VERIFIED` | 403 | Action requires verified email |
| `ACCOUNT_SUSPENDED` | 403 | User status suspended/closed |
| `KYC_REQUIRED` | 403 | KYC not approved |
| `NOT_FOUND` | 404 | Resource missing or not visible |
| `CONFLICT` | 409 | Illegal state transition |
| `INSUFFICIENT_BALANCE` | 422 | Withdrawal/lock exceeds available |
| `BELOW_MINIMUM` | 422 | Below configured minimum |
| `ABOVE_MAXIMUM` | 422 | Above configured maximum |
| `WITHDRAWAL_COOLDOWN` | 422 | Cooldown window active |
| `RETURN_ALREADY_APPLIED` | 409 | Trading day already distributed |
| `RUN_IN_PROGRESS` | 409 | Daily return job running |
| `RATE_LIMITED` | 429 | Too many requests |
| `MAINTENANCE_MODE` | 503 | Platform maintenance (money APIs blocked) |
| `UPLOAD_TOO_LARGE` | 413 | File exceeds limit |
| `UNSUPPORTED_MEDIA` | 415 | MIME not allowed |
| `INTERNAL_ERROR` | 500 | Unexpected server failure |
| `NETWORK_ERROR` | — | Client-side only |

---

## 4. Pagination, sorting, filtering

### Query parameters (list endpoints)

| Param | Type | Default | Rules |
|-------|------|---------|-------|
| `page` | int ≥ 1 | `1` | |
| `limit` | int | `20` | Max **100** |
| `sortBy` | string | endpoint-specific | Whitelist only |
| `sortOrder` | `asc` \| `desc` | `desc` | |
| `from` | ISO date/datetime | — | Inclusive lower bound |
| `to` | ISO date/datetime | — | Inclusive upper bound |
| `q` | string | — | Full-text / ILIKE on allowed fields |
| `status` | enum | — | When resource has status |
| `cursor` | string | — | Optional cursor mode (future); if present, ignores `page` |

### Sorting whitelist examples

| Resource | Allowed `sortBy` |
|----------|------------------|
| Deposits / withdrawals | `createdAt`, `amount`, `status` |
| Trades | `date`, `pair`, `returnPct`, `publishedAt` |
| Users (admin) | `createdAt`, `email`, `status`, `kycStatus` |
| Audit | `createdAt`, `action` |
| Ledger | `createdAt`, `amount` |

Unknown `sortBy` → `VALIDATION_ERROR`.

### Filtering

- Prefer explicit query params (`status`, `pair`, `type`, `assigneeId`) over free-form JSON.  
- `q` is sanitized; min length 2; max 100.  
- Date ranges must satisfy `from ≤ to` or `VALIDATION_ERROR`.

---

## 5. Rate limits

Approximate defaults (per IP unless noted). Exceeding returns `429` + `Retry-After`.

| Scope | Limit |
|-------|-------|
| Global anonymous | 120 req / min / IP |
| Authenticated investor | 300 req / min / user |
| Admin | 600 req / min / user |
| `POST /auth/login` | 10 / 15 min / IP + email |
| `POST /auth/register` | 5 / hour / IP |
| `POST /auth/forgot-password` | 5 / hour / email |
| OTP / verify resend | 1 / 60s · 10 / day |
| `POST /deposits` | 10 / hour / user |
| `POST /withdrawals` | 5 / hour / user |
| `POST /contact` | 5 / hour / IP |
| Admin exports | 10 / hour / user |
| Uploads | 30 / hour / user |
| Daily return `process` | 5 / hour / admin (plus idempotency) |

Maintenance mode: money mutating endpoints return `MAINTENANCE_MODE` (503).

---

## 6. Permissions / RBAC

### Coarse `user.role`

`USER` · `ADMIN` · `SUPER_ADMIN`

### Staff role keys (assignments)

| Role | Typical permissions |
|------|---------------------|
| `SUPER_ADMIN` | `*` |
| `FINANCE` | deposits, withdrawals, wallets, reports, payment methods |
| `SUPPORT` | tickets, users.view, notifications |
| `KYC_OFFICER` | kyc, users.view |
| `TRADING_MANAGER` | trades, daily returns, performance, ticker |
| `CONTENT_MANAGER` | cms.*, announcements, emails, activity |
| `VIEWER` | read-only on admin GETs |

Endpoints list **minimum** role. Viewer may call admin GETs but not POST/PATCH/DELETE.

---

## 7. Public & CMS

### `GET /settings/public` 🔓

**Response `data`:** public brand flags — maintenance mode (boolean only), support email, min deposit display, feature flags safe for UI.

### `GET /cms/public/bootstrap` 🔓

**Response `data`:**

```json
{
  "landing": { },
  "ticker": { "display": { }, "pairs": [] },
  "performance": { },
  "faqs": [],
  "testimonials": [],
  "announcements": [],
  "siteSeo": { },
  "activity": { }
}
```

Only **published** content. No drafts.

### `GET /cms/public/reports` 🔓

**Query:** pagination · `type`  
**Response:** published report docs `{ id, title, type, periodLabel, fileName, url, publishedAt, downloads }`

### `GET /cms/public/reports/:id/download` 🔓

**Response:** redirect or signed URL; increments download counter.

### `GET /performance/public` 🔓

**Response:** published monthly/yearly aggregates + marketing KPIs.

---

## 8. Investor auth

### `POST /auth/register` 🔓

**Request:**

```json
{
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string?",
  "country": "ISO2?",
  "referralCode": "string?",
  "acceptTerms": true
}
```

**Validation:** email format; password ≥ 8 with complexity policy; `acceptTerms` must be true; names 1–60 chars.  
**Response:** `{ "userId": "uuid" }` (generic success even if email exists — anti-enumeration optional policy: always 200 with same shape).  
**Errors:** `VALIDATION_ERROR`, `RATE_LIMITED`, `CONFLICT`

### `POST /auth/login` 🔓

**Request:** `{ "email", "password", "rememberMe"?: boolean, "otp"?: string }`  
**Response:** `{ "user": User }` + Set-Cookie  
**Errors:** `UNAUTHENTICATED`, `ACCOUNT_SUSPENDED`, `EMAIL_NOT_VERIFIED` (if policy blocks), `RATE_LIMITED`, `VALIDATION_ERROR`

### `POST /auth/logout` 🔒

**Response:** `{ "ok": true }` — clears cookies, revokes refresh.

### `POST /auth/refresh` 🔓 (+ refresh cookie)

**Response:** new access cookie/token  
**Errors:** `UNAUTHENTICATED`, `TOKEN_EXPIRED`

### `GET /auth/me` 🔒

**Response:** `{ "user": User, "wallet": Wallet | null }`

### `POST /auth/verify-email` 🔓

**Request:** `{ "email"?: string, "code": "6-digit" }` or `{ "token": "string" }`  
**Response:** `{ "ok": true }` + session cookies  
**Errors:** `VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMITED`

### `POST /auth/verify-email/resend` 🔒 or 🔓+email

**Request:** `{ "email"?: string }`  
**Response:** `{ "ok": true }`  
**Errors:** `RATE_LIMITED`

### `POST /auth/forgot-password` 🔓

**Request:** `{ "email" }`  
**Response:** always `{ "ok": true }`  
**Errors:** `RATE_LIMITED`, `VALIDATION_ERROR`

### `POST /auth/reset-password` 🔓

**Request:** `{ "token" | "email"+"code", "password" }`  
**Response:** `{ "ok": true }`  
**Errors:** `VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMITED`

### `POST /auth/change-password` 🔒

**Request:** `{ "currentPassword", "newPassword" }`  
**Response:** `{ "ok": true }` — revoke other sessions  
**Errors:** `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`

### `GET /auth/sessions` 🔒

**Response:** list of sessions `{ id, ip, userAgent, createdAt, current }`

### `DELETE /auth/sessions/:id` 🔒

**Response:** `{ "ok": true }`  
**Errors:** `NOT_FOUND`, `FORBIDDEN`

### `GET /auth/google` 🔓

**Response:** 302 to Google OAuth.

### `GET /auth/google/callback` 🔓

**Query:** OAuth params  
**Response:** Set-Cookie + redirect to app.

---

## 9. Investor profile & settings

### `GET /me` 🔒 — alias of profile portion of `/auth/me`

### `PATCH /me` 🔒✅

**Request:** `{ firstName?, lastName?, phone?, country?, timezone?, avatarKey? }`  
**Validation:** field lengths; country ISO2  
**Response:** `User`  
**Errors:** `VALIDATION_ERROR`, `EMAIL_NOT_VERIFIED`

### `POST /me/email-change/request` 🔒✅

**Request:** `{ "newEmail" }` → sends OTP  
**Errors:** `CONFLICT`, `RATE_LIMITED`

### `POST /me/email-change/confirm` 🔒✅

**Request:** `{ "newEmail", "code" }`  
**Response:** updated `User`

### `GET /me/preferences` 🔒

**Response:** `{ theme?, marketingOptIn?, notificationPreferences summary }`

### `PATCH /me/preferences` 🔒

**Request:** preference patch  
**Errors:** `VALIDATION_ERROR`

### `GET /notifications/preferences` 🔒 / `PATCH /notifications/preferences` 🔒

**Request/Response:** array of `{ channel, type, enabled }`

### `POST /me/2fa/setup` 🔒✅ → `{ otpauthUrl, secretMasked }`  
### `POST /me/2fa/confirm` 🔒✅ `{ code }` → `{ ok }`  
### `POST /me/2fa/disable` 🔒✅ `{ password, code }` → `{ ok }`

---

## 10. KYC

### `GET /kyc/status` 🔒✅

**Response:** `{ status, rejectionReason?, submittedAt?, documents: [...] }`

### `POST /kyc/documents` 🔒✅

**Request:** multipart — `type` (`ID_FRONT`|`ID_BACK`|`SELFIE`|…) + `file`  
**Validation:** MIME image/pdf; max size (e.g. 10MB); required set before submit  
**Response:** `Document`  
**Errors:** `VALIDATION_ERROR`, `UPLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA`, `CONFLICT`

### `POST /kyc/submit` 🔒✅

**Response:** `{ status: "PENDING" }`  
**Errors:** `CONFLICT` if incomplete or already pending/approved

---

## 11. Wallet

### `GET /wallet` 🔒✅

**Response:** `Wallet`

### `GET /wallet/summary` 🔒✅

**Response:** balances + invested + totals + todayReturnPct? + recent activity teaser

### `GET /wallet/transactions` 🔒✅

**Query:** pagination · `type` (ledger_entry_type) · `from` · `to` · `sortBy=createdAt`  
**Response:** paginated ledger-shaped rows (no separate transactions table)  
**Permissions:** own wallet only

---

## 12. Deposits

### `GET /deposits/methods` 🔒✅🪪

**Response:** active `PaymentMethod[]` with instructions (no secrets beyond what’s needed to pay)

### `GET /deposits` 🔒✅

**Query:** pagination · `status` · `from` · `to`  
**Response:** paginated `Deposit[]`

### `GET /deposits/:id` 🔒✅

**Response:** `Deposit`  
**Errors:** `NOT_FOUND` (if not owner)

### `POST /deposits` 🔒✅🪪 + **Idempotency-Key**

**Request:** `{ "paymentMethodId": "uuid", "amount": "100.00", "userReference"?: "string" }`  
**Validation:** amount decimal string; within min/max; method active  
**Response:** `Deposit` status `PENDING`  
**Errors:** `BELOW_MINIMUM`, `ABOVE_MAXIMUM`, `VALIDATION_ERROR`, `KYC_REQUIRED`, `MAINTENANCE_MODE`, `RATE_LIMITED`

### `POST /deposits/:id/proof` 🔒✅

**Request:** multipart `file`  
**Response:** `{ proofKey, deposit }`  
**Errors:** `CONFLICT` if not pending, `UPLOAD_TOO_LARGE`

### `POST /deposits/:id/cancel` 🔒✅

**Response:** deposit `CANCELLED`  
**Errors:** `CONFLICT` if already reviewed

---

## 13. Withdrawals & payout methods

### `GET /withdrawals/limits` 🔒✅🪪

**Response:** `{ min, max, dailyLimit, remainingToday, cooldownEndsAt?, availableBalance }`

### `GET /withdrawals` 🔒✅ · `GET /withdrawals/:id` 🔒✅

Paginated list / detail — own resources only.

### `POST /withdrawals` 🔒✅🪪 + **Idempotency-Key**

**Request:** `{ "payoutMethodId": "uuid", "amount": "50.00" }`  
**Behaviour:** locks funds (`WITHDRAWAL_LOCKED` ledger)  
**Errors:** `INSUFFICIENT_BALANCE`, `WITHDRAWAL_COOLDOWN`, `BELOW_MINIMUM`, `ABOVE_MAXIMUM`, `MAINTENANCE_MODE`

### `POST /withdrawals/:id/cancel` 🔒✅

Unlocks if still cancellable → `CANCELLED`  
**Errors:** `CONFLICT`

### Payout methods

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/payout-methods` | 🔒✅ | List own |
| POST | `/payout-methods` | 🔒✅ | Create (validate type-specific fields) |
| PATCH | `/payout-methods/:id` | 🔒✅ | Update label/default |
| DELETE | `/payout-methods/:id` | 🔒✅ | Soft delete |

**Validation:** type enum; required fields per BANK/CRYPTO/UPI; cannot delete if in-flight withdrawal references without snapshot (snapshot always stored on withdrawal).

---

## 14. Performance & trades (investor/public)

### `GET /performance/summary` 🔒✅

Personal ROI, this month profit, win rate, etc. → `PerformanceSummary`

### `GET /performance/series` 🔒✅

**Query:** `from` · `to` · granularity  
**Response:** `EquityPoint[]`

### `GET /performance/monthly` 🔓 or 🔒

Published programme monthly bars (public CMS/performance snapshot).

### `GET /performance/yearly` 🔓

Published yearly returns.

### `GET /performance/distributions` 🔒✅

**Query:** pagination · date range  
**Response:** investor `ProfitDistribution[]`

### `GET /trades` 🔓

**Query:** pagination · `pair` · `from` · `to` · `sortBy`  
**Filter:** `publishStatus=PUBLISHED` & public only  
**Response:** `Trade[]`

### `GET /trades/:id` 🔓 (published) or 🔒 (if private future)

**Errors:** `NOT_FOUND`

### `GET /trades/pairs` 🔓

Distinct pairs list.

### `GET /trades/stats` 🔓

Aggregate win rate, count, etc. for published set.

---

## 15. Notifications

### `GET /notifications` 🔒

**Query:** pagination · `unreadOnly` · `type` · `archived`  
**Response:** paginated notifications (+ optional `unreadCount` in data meta)

### `GET /notifications/unread-count` 🔒

**Response:** `{ "count": 0 }`

### `POST /notifications/:id/read` 🔒 → `{ ok }`  
### `POST /notifications/read-all` 🔒 → `{ ok }`  
### `POST /notifications/:id/archive` 🔒 → `{ ok }`

**Errors:** `NOT_FOUND`

---

## 16. Support (investor)

### `POST /support/tickets` 🔒✅

**Request:** `{ "category", "subject", "message", "priority"?: "LOW"|"NORMAL"|"HIGH" }`  
**Validation:** subject 3–160; message 1–5000; category enum  
**Response:** ticket + first message

### `GET /support/tickets` 🔒✅

Own tickets, paginated · filter `status`

### `GET /support/tickets/:id` 🔒✅

Ticket + messages (no internal notes)

### `POST /support/tickets/:id/messages` 🔒✅

**Request:** `{ "body" }` + optional multipart attachments  
**Errors:** `CONFLICT` if closed

### `POST /support/tickets/:id/attachments` 🔒✅

Multipart upload linked to latest/new message.

---

## 17. Referrals

### `GET /referrals/me` 🔒✅ (feature flag)

**Response:** `{ code, inviteUrl, attributionsCount, rewardsTotal }`  
**Errors:** `FORBIDDEN` if referrals disabled · `NOT_FOUND`

---

## 18. Contact

### `POST /contact` 🔓

**Request:** `{ "name", "email", "category", "message", "website"?: "" }`  
Honeypot: if `website` filled → silent `{ ok: true }`  
**Validation:** email; message length; captcha optional  
**Errors:** `VALIDATION_ERROR`, `RATE_LIMITED`

---

## 19. Admin authentication

### `POST /admin/auth/login` 🔓

**Request:** `{ "email", "password", "otp"?: string }`  
**Response:** `{ "user", "roles": string[] }` + admin cookies  
**Errors:** `UNAUTHENTICATED`, `FORBIDDEN` (not staff), `RATE_LIMITED`

### `POST /admin/auth/logout` 🛡  
### `GET /admin/auth/me` 🛡 → user + roles + permissions  
### `POST /admin/auth/2fa/setup` 🛡 · `POST /admin/auth/2fa/confirm` 🛡 `{ code }`

---

## 20. Admin operations

### Analytics

### `GET /admin/analytics/overview` 🛡|👁

**Response:** pending KYC/deposits/withdrawals, AUM, active users, chart series

### Users

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/admin/users` | 🛡|👁 | `q`, status, kycStatus, pagination, sort | paginated users |
| GET | `/admin/users/:id` | 🛡|👁 | — | user + wallet + flags |
| PATCH | `/admin/users/:id` | 🛡 | profile admin fields | user |
| POST | `/admin/users/:id/suspend` | 🛡 | `{ reason }` | user |
| POST | `/admin/users/:id/activate` | 🛡 | — | user |
| POST | `/admin/users/:id/notes` | 🛡 | `{ body }` | note |
| GET | `/admin/users/:id/timeline` | 🛡|👁 | pagination | events |
| POST | `/admin/users/:id/force-logout` | 🛡 | — | `{ ok }` |

### KYC

| Method | Path | Auth | Request |
|--------|------|------|---------|
| GET | `/admin/kyc` | KYC+|👁 | `status`, pagination |
| GET | `/admin/kyc/:userId` | KYC+|👁 | documents + user |
| POST | `/admin/kyc/:userId/approve` | KYC+ | `{ note? }` |
| POST | `/admin/kyc/:userId/reject` | KYC+ | `{ reason }` required |

**Errors:** `CONFLICT` if not pending · writes audit + email

### Deposits (admin)

| Method | Path | Auth | Request |
|--------|------|------|---------|
| GET | `/admin/deposits` | FINANCE+|👁 | status, q, pagination |
| GET | `/admin/deposits/:id` | FINANCE+|👁 | — |
| POST | `/admin/deposits/:id/approve` | FINANCE+ | `{ note?, creditedAmount? }` + Idempotency-Key |
| POST | `/admin/deposits/:id/reject` | FINANCE+ | `{ reason }` |

Approve posts `DEPOSIT_APPROVED` ledger entry.

### Withdrawals (admin)

| Method | Path | Auth | Request |
|--------|------|------|---------|
| GET | `/admin/withdrawals` | FINANCE+|👁 | filters |
| GET | `/admin/withdrawals/:id` | FINANCE+|👁 | — |
| POST | `/admin/withdrawals/:id/approve` | FINANCE+ | `{ note? }` |
| POST | `/admin/withdrawals/:id/reject` | FINANCE+ | `{ reason }` — unlocks |
| POST | `/admin/withdrawals/:id/mark-paid` | FINANCE+ | `{ externalReference }` — completes ledger |

### Wallets (admin)

### `POST /admin/wallets/:userId/adjust` 👑 or FINANCE+ (policy) + Idempotency-Key

**Request:** `{ "amount": "10.00", "direction": "CREDIT"|"DEBIT", "reason": "string" }`  
**Response:** `{ ledgerEntry, wallet }`  
**Errors:** `INSUFFICIENT_BALANCE`, `VALIDATION_ERROR`

### `POST /admin/wallets/:userId/freeze` / `…/unfreeze` 🛡

---

## 21. Admin trading & daily returns

### Trades

| Method | Path | Auth | Request / notes |
|--------|------|------|-----------------|
| GET | `/admin/trades` | TRADING+|👁 | filters include drafts |
| GET | `/admin/trades/:id` | TRADING+|👁 | |
| POST | `/admin/trades` | TRADING+ | create body |
| PATCH | `/admin/trades/:id` | TRADING+ | patch; conflict if day distributed |
| DELETE | `/admin/trades/:id` | TRADING+ | soft-delete draft only |
| POST | `/admin/trades/:id/publish` | TRADING+ | sets PUBLISHED |

**Create body validation:** pair, direction enum, entry/exit prices, returnPct string, tradingDay date, optional notes/imageKey.

### Trading days

| Method | Path | Auth |
|--------|------|------|
| GET | `/admin/trading-days` | TRADING+|👁 |
| GET | `/admin/trading-days/:date` | TRADING+|👁 |
| POST | `/admin/trading-days/:date/publish` | TRADING+ | optional override pct |

### Daily returns

| Method | Path | Auth | Request |
|--------|------|------|---------|
| GET | `/admin/daily-returns` | TRADING+|👁 | pagination |
| GET | `/admin/daily-returns/:id` | TRADING+|👁 | run + stats |
| POST | `/admin/daily-returns` | TRADING+ | `{ date, returnPct, returnBasis? }` |
| POST | `/admin/daily-returns/:id/preview` | TRADING+ | eligible wallet preview |
| POST | `/admin/daily-returns/:id/process` | TRADING+ | Idempotency-Key + confirmPhrase? |
| POST | `/admin/daily-returns/:id/reverse` | 👑 | `{ reason }` |

**Errors:** `RETURN_ALREADY_APPLIED`, `RUN_IN_PROGRESS`, `VALIDATION_ERROR`, `CONFLICT`

---

## 22. Admin CMS

All CMS mutating routes: **CONTENT_MANAGER** or **SUPER_ADMIN**. GETs: + Viewer.

### Landing

| Method | Path | Body / notes |
|--------|------|----------------|
| GET | `/admin/cms/landing` | draft + published meta |
| PUT | `/admin/cms/landing` | full/partial draft patch |
| POST | `/admin/cms/landing/publish` | confirm; writes revision |
| GET | `/admin/cms/revisions` | `?module=LANDING` |

### Pages / FAQ / testimonials

| Method | Path |
|--------|------|
| GET/PUT | `/admin/cms/pages/:slug` |
| GET/POST | `/admin/cms/faqs` |
| PATCH/DELETE | `/admin/cms/faqs/:id` |
| GET/POST | `/admin/cms/testimonials` |
| PATCH/DELETE | `/admin/cms/testimonials/:id` |

**Testimonial validation:** rating 1–5; name/quote required.

### Media

| Method | Path |
|--------|------|
| GET | `/admin/cms/media` | filter `kind`, `q`, pagination |
| POST | `/admin/cms/media` | metadata after upload |
| PATCH | `/admin/cms/media/:id` | rename |
| DELETE | `/admin/cms/media/:id` | soft delete |

### Site SEO

### `GET/PUT /admin/cms/site-seo` 🛡 Content+

Fields: websiteName, logoUrl, faviconUrl, metaTitle, metaDescription, googleAnalyticsId, facebookPixelId, maintenanceMode, maintenanceMessage, supportHours, supportPhone, supportEmail.

### Ticker

| Method | Path |
|--------|------|
| GET/PUT | `/admin/cms/ticker/display` |
| GET/POST | `/admin/cms/ticker/pairs` |
| PATCH/DELETE | `/admin/cms/ticker/pairs/:id` |
| POST | `/admin/cms/ticker/pairs/reorder` | `{ ids: [] }` |

### Performance CMS

### `GET/PUT /admin/cms/performance` · `POST /admin/cms/performance/publish`

### Announcements & activity

| Method | Path |
|--------|------|
| GET/POST | `/admin/cms/announcements` |
| PATCH | `/admin/cms/announcements/:id` |
| POST | `/admin/cms/announcements/:id/publish` |
| POST | `/admin/cms/announcements/:id/archive` |
| DELETE | `/admin/cms/announcements/:id` |
| GET/PUT | `/admin/cms/activity` |

**Announcement validation:** title required; priority/color/displayPage enums; expiresAt ≥ now if set.

### Report library

| Method | Path |
|--------|------|
| GET/POST | `/admin/cms/reports` |
| PATCH | `/admin/cms/reports/:id` |
| POST | `/admin/cms/reports/:id/publish` |
| DELETE | `/admin/cms/reports/:id` |

### Backup

### `POST /admin/cms/backup` 👑|CONTENT

**Request:** `{ "scope": "settings"|"content"|"reports"|"full", "format": "json"|"csv" }`  
**Response:** file download or `{ url }`  
### `POST /admin/cms/restore` 👑 — optional; body = backup payload; high risk

---

## 23. Admin communications

### Email templates

| Method | Path | Auth |
|--------|------|------|
| GET | `/admin/email-templates` | CONTENT+|👁 |
| GET | `/admin/email-templates/:key` | CONTENT+|👁 |
| PUT | `/admin/email-templates/:key` | CONTENT+ | `{ subject, bodyHtml, name? }` |

### Email outbox / send

| Method | Path |
|--------|------|
| GET | `/admin/emails/outbox` | pagination, status, templateKey |
| POST | `/admin/emails/send` | `{ templateKey, userId?\|email, variables }` |

### Notification campaigns / broadcast

| Method | Path |
|--------|------|
| GET/POST | `/admin/notification-campaigns` |
| POST | `/admin/notification-campaigns/:id/send` |
| POST | `/admin/broadcasts` | compose |
| POST | `/admin/broadcasts/:id/send` | |

**Audience validation:** enum + detail schema per audience type.

### Support (admin)

| Method | Path | Auth |
|--------|------|------|
| GET | `/admin/support/tickets` | SUPPORT+|👁 | filters status, priority, assignee, q |
| GET | `/admin/support/tickets/:id` | includes internal messages |
| POST | `/admin/support/tickets/:id/reply` | `{ body, internal?: boolean }` |
| POST | `/admin/support/tickets/:id/assign` | `{ assigneeId }` |
| PATCH | `/admin/support/tickets/:id` | status, priority, category |
| POST | `/admin/support/tickets/:id/close` | `{ note? }` |

---

## 24. Admin settings, roles, audit, reports

### Settings & toggles

| Method | Path | Auth |
|--------|------|------|
| GET | `/admin/settings` | 👑|FINANCE read |
| PUT | `/admin/settings` | 👑 | `{ items: [{ key, value }] }` |
| GET/PUT | `/admin/feature-toggles` | 👑 |

### Payment methods (rails)

Full CRUD under `/admin/payment-methods` — 👑 or FINANCE per policy · soft delete · validation of account_details jsonb by type.

### Roles & staff

| Method | Path | Auth |
|--------|------|------|
| GET | `/admin/roles` | 👑|👁 | matrix |
| PUT | `/admin/users/:id/roles` | 👑 | `{ roleKeys: [] }` |
| GET | `/admin/staff` | 👑 |
| POST | `/admin/staff/invites` | 👑 | `{ email, roleKey }` |
| POST | `/admin/staff/invites/:id/revoke` | 👑 | |

### Audit

### `GET /admin/audit` 🛡|👁

**Query:** `actorId`, `action`, `entityType`, `entityId`, `from`, `to`, pagination, sort  
**Response:** paginated audit rows (secrets redacted)

### `GET /admin/audit/export` 👑 — CSV · rate limited

### Ops reports

| Method | Path | Auth |
|--------|------|------|
| GET | `/admin/reports/deposits` | FINANCE+|👁 | aggregates |
| GET | `/admin/reports/withdrawals` | FINANCE+|👁 | |
| GET | `/admin/reports/distributions` | FINANCE+|👁 | |
| GET | `/admin/reports/users` | 🛡|👁 | |
| GET | `/admin/reports/export` | 👑|FINANCE | `type`, `format=csv|xlsx`, date range |

---

## 25. Uploads

### `POST /uploads/sign` 🔒 or 🛡

**Request:** `{ "purpose": "kyc"|"deposit_proof"|"media"|"report"|"avatar"|"support", "mime", "sizeBytes", "filename" }`  
**Validation:** purpose allow-list; MIME allow-list; size caps per purpose  
**Response:** `{ "uploadUrl", "storageKey", "headers", "expiresAt" }`  
**Errors:** `UPLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA`, `FORBIDDEN`, `RATE_LIMITED`

Client PUTs file to signed URL, then references `storageKey` in domain POSTs.

---

## 26. Health

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/health` | 🔓 | `{ status: "ok", version, time }` |
| GET | `/health/ready` | 🔓 | DB (+ Redis) ping; 503 if not ready |

---

## 27. WebSocket endpoints (future)

**Base:** `wss://{host}/ws/v1` · Auth via ticket query `?ticket=` (short-lived JWT from `POST /ws/ticket` 🔒/🛡) or cookie on same origin.

| Channel | Direction | Purpose | Payload (logical) |
|---------|-----------|---------|-------------------|
| `/ws/v1/notifications` | Server → client | Real-time in-app notifications | `{ type, notification }` |
| `/ws/v1/wallet` | Server → client | Balance / lock updates after ledger posts | `{ wallet }` |
| `/ws/v1/ticker` | Server → client | Live pair price ticks (admin CMS or feed) | `{ pair, price, change }` |
| `/ws/v1/admin/queues` | Server → admin | Pending deposit/KYC/withdrawal counts | `{ deposits, kyc, withdrawals }` |
| `/ws/v1/support/:ticketId` | Bidirectional | Live ticket messages | `{ message }` |
| `/ws/v1/returns/:runId` | Server → admin | Daily return process progress | `{ processed, total, status }` |

### WebSocket rules

- Heartbeat every 30s; idle disconnect 120s  
- Rate-limit subscribe attempts  
- Reconnect with backoff; clients reconcile via REST  
- No money mutations over WS — read/progress only  
- Admin channels require staff ticket  

### `POST /ws/ticket` 🔒 or 🛡

**Response:** `{ "ticket": "…", "expiresAt": "…" }` (TTL ~60s, single use)

---

## 28. Idempotency

| Rule | Detail |
|------|--------|
| Header | `Idempotency-Key: <uuid v4>` |
| Required on | `POST /deposits`, `POST /withdrawals`, deposit/withdrawal admin approve, wallet adjust, daily-return process |
| Storage | Persist key + response for ≥ 24h |
| Replay | Same key + same actor + same body hash → return stored response |
| Conflict | Same key + different body → `CONFLICT` |

---

## Endpoint index (quick list)

**Public:** settings/public · cms/public/* · performance/public · trades (published) · contact · health · auth register/login/oauth/forgot/reset/verify  

**Investor:** auth/* · me/* · kyc/* · wallet/* · deposits/* · withdrawals/* · payout-methods · performance/* · trades · notifications/* · support/* · referrals · uploads/sign · ws/ticket  

**Admin:** admin/auth/* · analytics · users · kyc · deposits · withdrawals · wallets · trades · trading-days · daily-returns · cms/* · email-templates · emails · notification-campaigns · broadcasts · support · settings · feature-toggles · payment-methods · roles · staff · audit · reports · uploads/sign · ws admin channels  

---

## Related documents

| Document | Role |
|----------|------|
| `DATABASE_SCHEMA.md` | Persistence model |
| `BACKEND_REQUIREMENTS.md` | Flow → API mapping |
| `SYSTEM_ARCHITECTURE.md` | System context |
| `packages/shared` `API_ROUTES` / `ERROR_CODES` / `ApiSuccess` | Code-level contracts |
| `docs/05-api-structure.md` | Historical Meridian examples |
| `DAILY_RETURN_ENGINE.md` | Return apply semantics |

---

**End of API documentation.** Implementation belongs in `apps/api`; this file is the normative REST + future WebSocket contract only.
