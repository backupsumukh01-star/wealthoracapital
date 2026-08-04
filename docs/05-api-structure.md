# 05 — API Structure

Base URL: `https://api.meridianfx.com/api/v1` (in production Nginx proxies `/api/*` on the same
origin, so the browser sees `https://meridianfx.com/api/v1/*` and cookies stay first-party).

---

## 1. Conventions

### Response envelope

Every response, success or failure, has the same shape. Clients never have to guess.

```jsonc
// success
{
  "success": true,
  "data": { /* the resource */ },
  "meta": { "requestId": "req_01J2X...", "timestamp": "2026-08-02T09:00:00.000Z" }
}

// paginated success
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": { "page": 1, "limit": 20, "total": 137, "totalPages": 7, "hasNext": true },
  "meta": { "requestId": "req_01J2X...", "timestamp": "..." }
}

// failure
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Your available balance is lower than the requested amount.",
    "details": { "available": "120.00", "requested": "500.00" }
  },
  "meta": { "requestId": "req_01J2X...", "timestamp": "..." }
}
```

`error.message` is always safe to display to an end user. Internal detail never leaves the server;
support correlates with `requestId`.

### Rules

| Rule | Detail |
|------|--------|
| Money in JSON | Always a **string**: `"1250.75"`. Never a JSON number |
| Dates | ISO 8601 UTC: `"2026-08-02T09:00:00.000Z"`; date-only fields `"2026-08-02"` |
| IDs | UUID v4 strings |
| Auth | `httpOnly` cookies (`mfx_at`, `mfx_rt`). `Authorization: Bearer` also accepted for future non-browser clients |
| Pagination | `?page=1&limit=20` (max 100) |
| Sorting | `?sortBy=createdAt&sortOrder=desc`, whitelisted fields only |
| Filtering | Documented per endpoint; unknown params rejected, not ignored |
| Idempotency | `Idempotency-Key` header honoured on all money-moving POSTs |
| Versioning | Path-based `/v1`. Breaking changes create `/v2`; `/v1` supported ≥ 6 months |
| CSRF | Double-submit token required on all cookie-authenticated state-changing requests |

### Error codes

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 422 | Body/query failed schema validation; `details` has field errors |
| `UNAUTHENTICATED` | 401 | Missing/invalid/expired access token |
| `TOKEN_EXPIRED` | 401 | Specifically expired — client should attempt refresh |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `EMAIL_NOT_VERIFIED` | 403 | Action requires a verified email |
| `ACCOUNT_SUSPENDED` | 403 | Account is suspended |
| `NOT_FOUND` | 404 | Resource missing or not visible to this actor |
| `CONFLICT` | 409 | State conflict (e.g. deposit already reviewed) |
| `INSUFFICIENT_BALANCE` | 422 | Not enough available funds |
| `BELOW_MINIMUM` / `ABOVE_MAXIMUM` | 422 | Amount outside configured limits |
| `WITHDRAWAL_COOLDOWN` | 422 | Too soon after a deposit |
| `RETURN_ALREADY_APPLIED` | 409 | Idempotency guard on the daily run |
| `RUN_IN_PROGRESS` | 409 | Another distribution is executing |
| `RATE_LIMITED` | 429 | Includes `Retry-After` |
| `MAINTENANCE_MODE` | 503 | Platform paused by admin |
| `INTERNAL_ERROR` | 500 | Unexpected; correlate via `requestId` |

### Rate limits

| Scope | Limit | Window |
|-------|-------|--------|
| Global per IP | 300 requests | 1 min |
| `POST /auth/login` | 5 per email + 10 per IP | 15 min |
| `POST /auth/register` | 3 per IP | 1 hour |
| `POST /auth/forgot-password` | 3 per email | 1 hour |
| `POST /auth/verify-email/resend` | 3 per user | 1 hour |
| `POST /deposits` | 10 per user | 1 hour |
| `POST /withdrawals` | 5 per user | 1 hour |
| File upload | 20 per user | 1 hour |
| Export (CSV/PDF) | 10 per user | 1 hour |
| Admin mutations | 100 per admin | 1 min |

---

## 2. Endpoint map

Legend: 🔓 public · 🔒 authenticated · ✅ verified email required · 🛡 admin · 👑 super-admin

### 2.1 Authentication — `/auth`

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| POST | `/auth/register` | 🔓 | Create account, send verification email |
| POST | `/auth/login` | 🔓 | Email + password → tokens |
| POST | `/auth/logout` | 🔒 | Revoke current session |
| POST | `/auth/logout-all` | 🔒 | Revoke every session for the user |
| POST | `/auth/refresh` | 🔓* | Rotate refresh token, issue new access token |
| GET | `/auth/me` | 🔒 | Current user + wallet summary |
| POST | `/auth/verify-email` | 🔓 | Consume verification token |
| POST | `/auth/verify-email/resend` | 🔒 | Re-send verification email |
| POST | `/auth/forgot-password` | 🔓 | Send reset link (always 200) |
| POST | `/auth/reset-password` | 🔓 | Consume reset token, set new password |
| POST | `/auth/change-password` | 🔒 | Old + new password, revokes other sessions |
| GET | `/auth/google` | 🔓 | Begin OAuth (state + PKCE) |
| GET | `/auth/google/callback` | 🔓 | Complete OAuth, set cookies, redirect |
| GET | `/auth/sessions` | 🔒 | List active sessions |
| DELETE | `/auth/sessions/:id` | 🔒 | Revoke one session |

\* `/auth/refresh` requires a valid refresh cookie but not an access token.

<details>
<summary><strong>Contract detail: register, login, refresh</strong></summary>

```jsonc
// POST /auth/register
{
  "firstName": "Ayesha",
  "lastName": "Khan",
  "email": "ayesha@example.com",
  "password": "••••••••••",          // ≥10 chars, zxcvbn score ≥3, breach-checked
  "acceptTerms": true,
  "acceptRisk": true,                 // required by the compliance posture
  "referralCode": "MFX7K2QA"          // optional
}
// 201 → { user: {...}, message: "Check your email to verify your account." }
// No tokens are issued until the email is verified.
```

```jsonc
// POST /auth/login
{ "email": "ayesha@example.com", "password": "••••••••••", "rememberMe": true }

// 200 → sets mfx_at (15 min) + mfx_rt (7d, or 30d with rememberMe)
{
  "user": { "id": "...", "email": "...", "firstName": "Ayesha",
            "role": "USER", "status": "ACTIVE", "emailVerified": true },
  "wallet": { "balance": "1250.75", "availableBalance": "1250.75",
              "totalProfit": "250.75", "roiPct": "25.07" }
}

// 403 EMAIL_NOT_VERIFIED  → client routes to /verify-email/sent
// 429 RATE_LIMITED        → includes Retry-After
// 423-equivalent handled as 403 ACCOUNT_SUSPENDED
```

```jsonc
// POST /auth/refresh   (no body; reads mfx_rt cookie)
// 200 → new mfx_at + rotated mfx_rt
// 401 → cookies cleared; if the presented token was already rotated,
//        the entire token family is revoked (reuse detection) and the
//        user is notified by email.
```
</details>

### 2.2 Current user — `/users/me`

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/users/me` | 🔒 | Full profile |
| PATCH | `/users/me` | 🔒 | Update name, phone, country, timezone |
| POST | `/users/me/avatar` | 🔒 | Upload avatar (multipart) |
| DELETE | `/users/me/avatar` | 🔒 | Remove avatar |
| GET | `/users/me/preferences` | 🔒 | Notification + UI preferences |
| PATCH | `/users/me/preferences` | 🔒 | Update preferences |
| GET | `/users/me/payout-methods` | 🔒 | List saved payout destinations |
| POST | `/users/me/payout-methods` | ✅ | Add payout method |
| PATCH | `/users/me/payout-methods/:id` | ✅ | Update |
| DELETE | `/users/me/payout-methods/:id` | ✅ | Remove |
| POST | `/users/me/close-account` | 🔒 | Request closure (requires zero balance) |

### 2.3 Wallet — `/wallet`

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/wallet` | 🔒 | Balance, locked, invested, total profit, ROI |
| GET | `/wallet/transactions` | 🔒 | Paginated ledger, filterable by type + date |
| GET | `/wallet/summary` | 🔒 | Dashboard aggregate (one call, see below) |

<details>
<summary><strong>Contract detail: <code>GET /wallet/summary</code> — the dashboard's single call</strong></summary>

Designed so the dashboard's above-the-fold content needs exactly one request.

```jsonc
{
  "wallet": {
    "balance": "1250.75",
    "availableBalance": "1150.75",
    "lockedBalance": "100.00",
    "investedAmount": "1000.00",
    "totalProfit": "250.75",
    "totalDeposited": "1000.00",
    "totalWithdrawn": "0.00"
  },
  "today": {
    "date": "2026-08-02",
    "profit": "8.75",
    "returnPct": "0.700000",
    "status": "DISTRIBUTED",          // or PENDING — "today's return is not in yet"
    "tradeCount": 3
  },
  "performance": {
    "roiPct": "25.07",
    "thisMonthProfit": "87.50",
    "thisMonthReturnPct": "7.25",
    "lastMonthReturnPct": "6.10",
    "bestDay":  { "date": "2026-07-14", "returnPct": "1.850000", "profit": "21.30" },
    "worstDay": { "date": "2026-07-22", "returnPct": "-0.640000", "profit": "-7.40" },
    "winRatePct": "78.60",
    "activeDays": 84,
    "avgDailyReturnPct": "0.310000"
  },
  "chart": {
    "range": "30d",
    "points": [ { "date": "2026-07-04", "balance": "1000.00", "profit": "0.00", "cumulativeProfit": "0.00" } ]
  },
  "recentTrades": [
    { "id": "...", "date": "2026-08-02", "pair": "EUR/USD", "direction": "BUY",
      "entryPrice": "1.17000000", "exitPrice": "1.17820000",
      "returnPct": "0.700000", "outcome": "WIN" }
  ],
  "pending": { "deposits": 1, "withdrawals": 0 },
  "unreadNotifications": 3
}
```
</details>

### 2.4 Deposits — `/deposits`

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/deposits/methods` | 🔒 | Active payment methods + instructions |
| POST | `/deposits` | ✅ | Create a pending deposit |
| POST | `/deposits/:id/proof` | ✅ | Upload proof screenshot (multipart) |
| GET | `/deposits` | 🔒 | Own deposits, filter by status/date |
| GET | `/deposits/:id` | 🔒 | One deposit (ownership enforced) |
| GET | `/deposits/:id/proof` | 🔒 | Stream the proof file (owner or admin) |
| POST | `/deposits/:id/cancel` | 🔒 | Cancel while still `PENDING` |

```jsonc
// POST /deposits            Idempotency-Key: <uuid>
{ "amount": "1000.00", "paymentMethodId": "uuid", "userReference": "TXN-99381", "userNote": "" }
// 201 → { "id": "...", "reference": "DEP-2026-000412", "status": "PENDING",
//         "amount": "1000.00", "uploadRequired": true, "expiresAt": "..." }
```

Proof upload: `multipart/form-data`, field `file`, max 5 MB, `image/jpeg|png|webp` or
`application/pdf`. Validated by **magic bytes**, not by the declared MIME type or extension.
Images are re-encoded to WebP and stripped of EXIF before storage.

### 2.5 Withdrawals — `/withdrawals`

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| POST | `/withdrawals` | ✅ | Request a withdrawal — locks funds immediately |
| GET | `/withdrawals` | 🔒 | Own withdrawals |
| GET | `/withdrawals/:id` | 🔒 | One withdrawal |
| POST | `/withdrawals/:id/cancel` | 🔒 | Cancel while `PENDING`, unlocks funds |
| GET | `/withdrawals/limits` | 🔒 | Min, max, fee, cooldown, available amount |

```jsonc
// POST /withdrawals         Idempotency-Key: <uuid>
{ "amount": "250.00", "payoutMethodId": "uuid", "note": "" }

// 201 → { "reference": "WDR-2026-000077", "status": "PENDING",
//         "amount": "250.00", "fee": "0.00", "netAmount": "250.00",
//         "availableBalanceAfter": "900.75" }

// 422 INSUFFICIENT_BALANCE   details: { available, requested }
// 422 WITHDRAWAL_COOLDOWN    details: { availableAt }
```

The lock happens inside the same transaction as the request. There is no window in which a user
can request two withdrawals totalling more than their balance.

### 2.6 Trades & trading days — `/trades`

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/trades` | 🔒 | Public trades, filter + sort + paginate |
| GET | `/trades/:id` | 🔒 | Trade detail |
| GET | `/trades/pairs` | 🔒 | Distinct pairs (for filter UI) |
| GET | `/trading-days` | 🔒 | Published days with net return + trade count |
| GET | `/trading-days/:date` | 🔒 | One day: trades, net return, the user's own earning |
| GET | `/trades/stats` | 🔒 | Win rate, avg return, best/worst pair |

Filter parameters on `GET /trades`:
`from`, `to`, `pair`, `direction` (`BUY`/`SELL`), `outcome` (`WIN`/`LOSS`/`BREAKEVEN`),
`minReturn`, `maxReturn`, `q` (free text over pair and notes),
`sortBy` ∈ {`date`,`pair`,`returnPct`}, `sortOrder`, `page`, `limit`.

### 2.7 Performance — `/performance`

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/performance/summary` | 🔒 | Lifetime ROI, totals, streaks |
| GET | `/performance/series?range=7d\|30d\|90d\|1y\|all` | 🔒 | Equity curve points |
| GET | `/performance/monthly?year=2026` | 🔒 | Per-month return %, profit, active days |
| GET | `/performance/yearly` | 🔒 | Per-year rollup |
| GET | `/performance/distributions` | 🔒 | The user's own profit distributions, paginated |
| GET | `/performance/public` | 🔓 | Aggregate platform stats for the landing page (cached 15 min) |

`GET /performance/public` returns only non-identifying aggregates — total return by month, win
rate, active traders count, AUM band — and never per-user data.

### 2.8 Notifications — `/notifications`

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/notifications` | 🔒 | Paginated, filter by type/unread |
| GET | `/notifications/unread-count` | 🔒 | Badge count (polled every 60s) |
| PATCH | `/notifications/:id/read` | 🔒 | Mark one read |
| POST | `/notifications/read-all` | 🔒 | Mark all read |
| DELETE | `/notifications/:id` | 🔒 | Dismiss |

### 2.9 Exports — `/exports`

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/exports/trades.csv` | 🔒 | Trades matching the same filters as the table |
| GET | `/exports/trades.pdf` | 🔒 | Branded trade report |
| GET | `/exports/transactions.csv` | 🔒 | Personal ledger |
| GET | `/exports/statement.pdf?month=2026-07` | 🔒 | Monthly statement |

Exports accept the identical filter query string as the corresponding list endpoint, guaranteeing
the file matches what the user is looking at. Responses stream with
`Content-Disposition: attachment` and are generated on demand, never cached to disk.

### 2.10 Platform — public

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/health` | 🔓 | Liveness |
| GET | `/health/ready` | 🔓 | DB + migrations + storage readiness |
| GET | `/settings/public` | 🔓 | Public settings (platform name, minimums, maintenance flag) |
| POST | `/contact` | 🔓 | Contact form (rate-limited, honeypot + captcha) |

---

## 3. Admin API — `/admin`

Every route below requires 🛡 `ADMIN` or 👑 `SUPER_ADMIN`, passes through the `audit` middleware,
and is additionally rate-limited.

### 3.1 Dashboard & reports

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/dashboard` | AUM, user counts, pending queues, today's P&L, alerts |
| GET | `/admin/reports/aum?range=` | AUM over time |
| GET | `/admin/reports/flows?range=` | Deposit vs withdrawal volume |
| GET | `/admin/reports/users?range=` | Signups, activation, retention |
| GET | `/admin/reports/returns?range=` | Distributed profit over time |

### 3.2 Users

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/admin/users` | 🛡 | Search, filter by status/role/balance/date |
| GET | `/admin/users/:id` | 🛡 | Full profile, wallet, ledger, requests, sessions |
| PATCH | `/admin/users/:id` | 🛡 | Edit profile fields |
| POST | `/admin/users/:id/suspend` | 🛡 | Suspend (reason required) |
| POST | `/admin/users/:id/activate` | 🛡 | Reactivate |
| POST | `/admin/users/:id/verify-email` | 🛡 | Manually mark verified |
| POST | `/admin/users/:id/adjust-balance` | 👑 | Manual credit/debit — reason mandatory |
| POST | `/admin/users/:id/revoke-sessions` | 🛡 | Force logout everywhere |
| PATCH | `/admin/users/:id/role` | 👑 | Change role |
| GET | `/admin/users/export.csv` | 🛡 | Export the filtered user list |

```jsonc
// POST /admin/users/:id/adjust-balance          👑 only
{ "type": "CREDIT", "amount": "50.00",
  "reason": "Goodwill credit — ticket #4471",   // required, min 10 chars
  "notifyUser": true }
// Writes: LedgerEntry(ADJUSTMENT_CREDIT) + AuditLog(before/after) + Notification
```

### 3.3 Deposits & withdrawals

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/deposits` | Queue with filters; default `status=PENDING` |
| GET | `/admin/deposits/:id` | Detail incl. proof URL and user history |
| POST | `/admin/deposits/:id/approve` | Credit wallet, write ledger, notify |
| POST | `/admin/deposits/:id/reject` | Reject with a reason, notify |
| POST | `/admin/deposits/bulk-approve` | Up to 50 ids, all-or-nothing per item |
| GET | `/admin/withdrawals` | Queue with filters |
| GET | `/admin/withdrawals/:id` | Detail incl. destination snapshot |
| POST | `/admin/withdrawals/:id/approve` | Convert lock → debit |
| POST | `/admin/withdrawals/:id/reject` | Unlock funds, notify with reason |
| POST | `/admin/withdrawals/:id/mark-paid` | Attach transaction ref + proof |

```jsonc
// POST /admin/deposits/:id/approve      Idempotency-Key: <uuid>
{ "creditedAmount": "1000.00",   // defaults to amount; may differ if fees applied
  "adminNote": "Verified against bank statement 02 Aug" }
// 409 CONFLICT if the deposit is not in PENDING/UNDER_REVIEW
```

### 3.4 Trades

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/trades` | All trades, incl. non-public |
| POST | `/admin/trades` | Record a trade (creates the `TradingDay` if absent) |
| PATCH | `/admin/trades/:id` | Edit — blocked once the day is `DISTRIBUTED` |
| DELETE | `/admin/trades/:id` | Delete — blocked once distributed |
| POST | `/admin/trades/import` | CSV bulk import with a preview step |
| GET | `/admin/trading-days` | All days with status |
| POST | `/admin/trading-days/:id/publish` | Make the day visible to investors |
| PATCH | `/admin/trading-days/:id` | Edit summary or override net return |

```jsonc
// POST /admin/trades
{
  "date": "2026-08-02",
  "pair": "EUR/USD",
  "direction": "BUY",
  "entryPrice": "1.17000",
  "exitPrice": "1.17820",
  "returnPct": "0.70",             // may be supplied, or computed and confirmed
  "lotSize": "1.0",
  "openedAt": "2026-08-02T08:15:00.000Z",
  "closedAt": "2026-08-02T11:40:00.000Z",
  "notes": "London session breakout above 1.1695 resistance.",
  "isPublic": true
}
// 201 → { trade, tradingDay: { date, computedReturnPct: "0.700000",
//                              status: "DRAFT", tradeCount: 1 } }
```

The server computes a suggested `returnPct` from entry/exit and direction and **warns** if the
submitted value differs by more than a configurable tolerance — it does not silently overwrite the
operator's number, because real return depends on position sizing.

### 3.5 Daily return — the engine

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/admin/daily-returns` | 🛡 | All runs with status |
| GET | `/admin/daily-returns/:id` | 🛡 | Run detail + per-user distributions |
| POST | `/admin/daily-returns/preview` | 🛡 | **Dry run** — no writes |
| POST | `/admin/daily-returns/apply` | 🛡 | Execute the distribution |
| GET | `/admin/daily-returns/:id/progress` | 🛡 | Poll progress for long runs |
| POST | `/admin/daily-returns/:id/reverse` | 👑 | Compensating reversal, reason required |
| GET | `/admin/daily-returns/:id/export.csv` | 🛡 | Per-user distribution export |

```jsonc
// POST /admin/daily-returns/preview
{ "date": "2026-08-02", "returnPct": "0.70" }   // returnPct optional → uses computed
// 200 (nothing written)
{
  "date": "2026-08-02",
  "returnPct": "0.700000",
  "returnBasis": "BALANCE",
  "trades": [ { "pair": "EUR/USD", "direction": "BUY", "returnPct": "0.700000" } ],
  "eligibleWallets": 1284,
  "excludedWallets": { "zeroBalance": 41, "suspended": 3 },
  "totalBaseAmount": "2841500.00",
  "totalDistribution": "19890.50",
  "roundingDelta": "0.14",
  "sample": [
    { "userId": "...", "name": "Ayesha K.", "eligibleBalance": "1250.75",
      "amount": "8.76", "balanceAfter": "1259.51" }
  ],
  "warnings": [
    "Return 0.70% is within the configured cap of 5.00%.",
    "3 wallets are suspended and will be skipped."
  ]
}
```

```jsonc
// POST /admin/daily-returns/apply       Idempotency-Key: <uuid>   (required)
{ "date": "2026-08-02", "returnPct": "0.70", "confirmToken": "APPLY-2026-08-02" }

// 202 Accepted → { "runId": "...", "status": "PROCESSING", "eligibleWallets": 1284 }
// 409 RETURN_ALREADY_APPLIED → { "existingRunId": "..." }
// 409 RUN_IN_PROGRESS
// 422 VALIDATION_ERROR       → e.g. return exceeds financial.maxDailyReturnPct
```

`confirmToken` must be typed by the operator in the UI and must match the date. It exists to make
an accidental click impossible; the real safety net is the unique constraint and advisory lock
described in [12 — Trading Engine](./12-trading-engine.md).

```jsonc
// POST /admin/daily-returns/:id/reverse    👑
{ "reason": "Trade 3 exit price entered incorrectly; desk confirmed 1.1755 not 1.1782.",
  "notifyUsers": true }
// 200 → { reversalRunId, walletsAffected, totalReversed }
// Writes PROFIT_REVERSAL ledger entries. Never deletes the original run.
```

### 3.6 Notifications & broadcast

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/admin/notifications/send` | Targeted notification to selected users |
| GET | `/admin/broadcasts` | List broadcasts |
| POST | `/admin/broadcasts` | Create draft |
| POST | `/admin/broadcasts/:id/preview` | Resolve segment → recipient count + sample |
| POST | `/admin/broadcasts/:id/test-send` | Send to the admin only |
| POST | `/admin/broadcasts/:id/send` | Queue the real send |
| GET | `/admin/broadcasts/:id/stats` | Sent, failed, opened |
| GET | `/admin/outbox/dead` | Dead-lettered events for inspection |
| POST | `/admin/outbox/:id/retry` | Requeue a dead event |

### 3.7 Settings, staff, audit

| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/admin/settings` | 🛡 | All settings grouped by category |
| PATCH | `/admin/settings` | 👑 | Update settings (audited, before/after) |
| GET | `/admin/payment-methods` | 🛡 | List |
| POST | `/admin/payment-methods` | 👑 | Create |
| PATCH | `/admin/payment-methods/:id` | 👑 | Update |
| DELETE | `/admin/payment-methods/:id` | 👑 | Deactivate (never hard delete) |
| GET | `/admin/email-templates` | 🛡 | List |
| PATCH | `/admin/email-templates/:key` | 👑 | Edit subject/body |
| POST | `/admin/email-templates/:key/preview` | 🛡 | Render with sample data |
| GET | `/admin/staff` | 👑 | Admin accounts |
| POST | `/admin/staff` | 👑 | Invite an admin |
| DELETE | `/admin/staff/:id` | 👑 | Revoke admin access |
| GET | `/admin/audit-logs` | 🛡 | Filter by actor, action, target, date |
| GET | `/admin/audit-logs/export.csv` | 👑 | Export |

---

## 4. Middleware order

Order is not cosmetic — it determines what gets logged, what gets rate-limited, and what an
attacker can reach.

```
1.  requestId            attach correlation id
2.  securityHeaders      helmet: CSP, HSTS, frameguard, noSniff
3.  cors                 strict allowlist, credentials: true
4.  compression
5.  bodyParser           json limit 1mb; raw for multipart routes only
6.  cookieParser         signed
7.  requestLogger        method, path, status, duration, userId, requestId
8.  rateLimit (global)   per IP
9.  maintenanceGate      503 for non-admins when maintenance mode is on
10. ── route matching ──
11. authenticate         verify access token → req.user
12. requireVerified      where the route demands it
13. authorize            role / permission check
14. rateLimit (route)    tighter, per-user or per-email
15. csrfProtection       for cookie-auth state-changing methods
16. validate             Zod on params, query, body
17. upload               multer + magic-byte + size checks
18. controller
19. audit                after success, for admin mutations
20. notFound
21. errorHandler         the single exit point
```

---

## 5. Idempotency

Any endpoint that moves money accepts an `Idempotency-Key` header (a client-generated UUID).

- The key + user + endpoint is stored with the resulting response for 24 hours.
- A repeat with the same key returns the **stored response**, does not re-execute.
- A repeat with the same key but a *different body* returns `409 CONFLICT`.
- `POST /admin/daily-returns/apply` **requires** the header; it is optional elsewhere but the web
  client always sends it.

This turns "the user double-clicked" and "the network retried" from incidents into non-events.

---

## 6. What the frontend calls, per page

| Page | Requests |
|------|----------|
| Landing | `GET /performance/public`, `GET /settings/public` (ISR, cached) |
| Dashboard | `GET /wallet/summary` (one call), `GET /notifications/unread-count` |
| Trade history | `GET /trades?<filters>`, `GET /trades/pairs` |
| Performance | `GET /performance/summary`, `/series`, `/monthly` |
| Deposit | `GET /deposits/methods`, `POST /deposits`, `POST /deposits/:id/proof` |
| Withdraw | `GET /withdrawals/limits`, `GET /users/me/payout-methods`, `POST /withdrawals` |
| Admin dashboard | `GET /admin/dashboard` |
| Apply daily return | `POST /admin/daily-returns/preview` → `POST /apply` → poll `/progress` |

The dashboard deliberately has a single aggregate endpoint rather than six parallel calls: it
halves time-to-meaningful-paint on mobile and keeps the numbers on screen mutually consistent,
which matters when they are all derived from the same balance.
