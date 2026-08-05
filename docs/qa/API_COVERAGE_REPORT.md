# API Coverage Report — Frontend ↔ Production API

**Date:** 2026-08-05  
**Base URL (prod):** `https://api.growzycapital.com/api/v1` (`NEXT_PUBLIC_API_URL`)  
**Transport:** `apps/web/src/lib/api-client.ts` — cookie auth (`credentials: 'include'`), CSRF header when `mfx_csrf` present  
**Scope:** Every declared frontend service call vs mounted Express routes; page wiring status  

---

## Executive summary

| Metric | Count (approx.) |
|--------|----------------:|
| Backend mounted endpoints (`/api` + `/api/v1`) | ~200 |
| Frontend service methods declared | ~120 |
| Frontend methods wired into **mounted** UI | ~20 |
| Frontend → missing backend | **5** |
| Backend without any frontend client | **~90+** |
| Duplicate client wrappers (same path) | **6** |

**Verdict:** The production API surface is largely implemented. The frontend **service layer** mostly targets correct `/api/v1` paths, but **most pages do not call those services**. Money/KYC/admin ops still use localStorage (Investor Lifecycle / Admin OS). Coverage below is therefore split into:

1. **Client contract** (service → API) — method/URL/auth alignment  
2. **Page wiring** (UI → service) — whether the page actually hits production  

---

## Client platform behaviour

| Concern | Implementation | Status |
|---------|----------------|--------|
| **HTTP method** | Per-service `method:` / default GET | ✅ Correct where declared |
| **URL** | `{NEXT_PUBLIC_API_URL}` + `API_ROUTES.*` (already includes `/api/v1`) | ✅ Prod rejects localhost |
| **Authentication** | httpOnly cookies `mfx_at` / `mfx_rt`; no Bearer in JS | ✅ |
| **Permissions** | Enforced **server-side** via `requirePermission` / `requireAdminAccess`; UI gates mostly absent | ⚠️ UI/API mismatch |
| **Validation** | Zod on API; client zod often weaker (password special-char) | ⚠️ |
| **Error codes** | Envelope `{ success, error: { code, message, details? }, meta }` → `ApiError` | ✅ |
| **Response shape** | Client expects `payload.success` then returns `payload.data` | ✅ |
| **Retry** | Queries: ≤2 unless 4xx; Mutations: **never** globally; 401 `TOKEN_EXPIRED` → one refresh retry | ✅ by design |
| **Timeout** | **None** — no `AbortSignal` / timeout on `apiClient` or multipart `fetch` | ❌ |
| **CSRF** | `X-CSRF-Token` from cookie; **no** client call to `GET /csrf` bootstrap | ⚠️ |
| **Multipart** | Raw `fetch` (deposit proof, KYC upload, media) — **no** TOKEN_EXPIRED refresh retry | ⚠️ |

Canonical error codes (shared):  
`VALIDATION_ERROR`, `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `FORBIDDEN`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_SUSPENDED`, `NOT_FOUND`, `CONFLICT`, `INSUFFICIENT_BALANCE`, `BELOW_MINIMUM`, `ABOVE_MAXIMUM`, `WITHDRAWAL_COOLDOWN`, `RETURN_ALREADY_APPLIED`, `RUN_IN_PROGRESS`, `RATE_LIMITED`, `MAINTENANCE_MODE`, `INTERNAL_ERROR`, `NETWORK_ERROR` (+ runtime `CSRF_REJECTED`).

---

## Page → API wiring matrix

| Page / surface | Expected production API | Actually calls | Correct? |
|----------------|-------------------------|----------------|----------|
| Homepage `/` | `GET /cms/public`, public performance/trades | Mostly Admin OS / emptied mocks | ❌ |
| Contact | Lead/contact API (none) | Fake timeout | ❌ / missing BE |
| Register | `POST /auth/register` | Lifecycle only | ❌ |
| Login | `POST /auth/login` | ✅ `useLogin` | ✅ |
| Google OAuth | `GET /auth/google` | Redirect to URL | ❌ **404 BE** |
| Forgot / reset / verify | auth password/verify routes | ✅ hooks | ✅ |
| Logout | `POST /auth/logout` | ✅ | ✅ |
| Session shell | `GET /auth/me` | ✅ `SessionProvider` | ✅ |
| Dashboard | wallet/trades/performance | Lifecycle / Admin OS | ❌ |
| Wallet | `GET /wallet`, summary | Lifecycle (except withdraw modal balance) | ❌ |
| Deposit submit | `POST /deposits`, proof | Lifecycle | ❌ |
| Withdraw submit | `POST /withdrawals` | Lifecycle | ❌ |
| Deposit/withdraw history panels | list endpoints | Hooks exist; **panels orphaned** | ⚠️ |
| Trades / performance / transactions | `/trades`, `/performance/*`, `/transactions` | Admin OS / lifecycle | ❌ |
| KYC onboarding | `/kyc/*` | Lifecycle | ❌ |
| Profile / security / settings | `/profile`, `/auth/change-password`, `/settings/me` | Lifecycle / local toast | ❌ |
| Notifications | `/notifications*` | ✅ provider | ✅ |
| Support tickets | `POST /support/tickets` | ✅ create only | ⚠️ partial |
| Referrals | — | Stub | 🚫 no API |
| Admin login | `/auth/login` + role | ✅ | ✅ |
| Admin overview / users / KYC / deposits / withdrawals | `/admin/*` | Lifecycle / Admin OS | ❌ |
| Admin trades page | `GET /admin/trades` | Admin OS (API component orphaned) | ❌ |
| Admin CMS / broadcast / emails / media / settings / audit | matching admin/cms routes | Admin OS | ❌ |
| Admin reports | `POST /admin/reports` | **`POST /reports/export`** (investor scope) | ❌ wrong endpoint |
| Admin system health | `GET /admin/health` | Calls client → **missing BE** | ❌ |

---

## Frontend client ↔ backend contract (by domain)

### Auth — mostly aligned

| Method | Client path | Backend | Auth | Perms | Validation | Wired UI |
|--------|-------------|---------|------|-------|------------|----------|
| POST | `/auth/register` | ✅ | public | — | `registerSchema` | ❌ unused |
| POST | `/auth/login` | ✅ | public | — | `loginSchema` | ✅ |
| POST | `/auth/logout` | ✅ | optional | — | — | ✅ |
| GET | `/auth/me` | ✅ | cookie | — | — | ✅ |
| POST | `/auth/refresh` | ✅ | refresh cookie | — | — | ✅ (client) |
| POST | `/auth/verify-email` | ✅ | public | — | zod | ✅ |
| POST | `/auth/verify-email/resend` | ✅ | public | — | zod | ✅ |
| POST | `/auth/forgot-password` | ✅ | public | — | zod | ✅ |
| POST | `/auth/reset-password` | ✅ | public | — | zod | ✅ |
| POST | `/auth/change-password` | ✅ | user | — | zod | ❌ unused |
| GET | `/auth/sessions` | ✅ | user | — | — | ❌ unused |
| DELETE | `/auth/sessions/:id` | ✅ | user | — | — | ❌ unused |
| GET | `/auth/google` | ❌ **missing** | — | — | — | login redirect |

### Wallet / deposits / withdrawals / transactions

| Method | Client path | Backend | Auth | Perms | Wired UI |
|--------|-------------|---------|------|-------|----------|
| GET | `/wallet` | ✅ | user | `wallet.view` | ⚠️ withdraw modal only |
| GET | `/wallet/summary` | ✅ | user | `wallet.view` | ❌ |
| GET | `/wallet/transactions` | ✅ | user | `wallet.view` | ❌ |
| GET | `/wallet/history` | ✅ BE | — | — | ❌ **no client method** |
| GET/POST | `/deposits*` | ✅ | user | deposits.* | ❌ create; history orphaned |
| GET/POST | `/withdrawals*` | ✅ | user | withdrawals.* | ❌ create |
| GET | `/transactions` | ✅ BE | user | `wallet.view` | ❌ **no client method** |

### Trades / performance / portfolio / returns

| Method | Client path | Backend | Wired UI |
|--------|-------------|---------|----------|
| GET | `/trades`, `/:id`, `/pairs`, `/stats`, `/public` | ✅ | ❌ |
| GET | `/performance/summary\|series\|monthly\|distributions\|public` | ✅ | ❌ |
| GET | `/performance/yearly` | ✅ BE | ❌ **no client** |
| GET | `/portfolio` | ✅ BE | ❌ **no client** |
| GET | `/returns` | ✅ BE | ❌ **no client** |

### KYC / profile / settings / CMS / notifications / support

| Domain | Client coverage | Backend | Wired UI |
|--------|-----------------|---------|----------|
| KYC investor + admin review | Nearly complete in `kyc.service` | ✅ | ❌ unused |
| Profile `/profile*` | ❌ **no dedicated client** (auth sessions only) | ✅ BE | ❌ |
| Users `/users/me` | ❌ no client | ✅ BE | ❌ |
| Settings public/me/admin/flags | `settings.service` | ✅ | ❌ unused |
| CMS public/landing/platform | `cms.service` (partial vs BE) | ✅ rich CMS | ❌ unused |
| Notifications | complete | ✅ (auth only, no perm middleware) | ✅ |
| Support investor create | partial | ✅ full admin support API | ⚠️ create only |

### Admin finance / trading / ops

| Client method | Path | Backend | Wired UI |
|---------------|------|---------|----------|
| `adminService.health` | `/admin/health` | ❌ **missing** | health page |
| `adminService.search` | `/admin/search` | ❌ **missing** | unused hook |
| `adminService.backups` GET/POST | `/admin/backups` | ❌ **missing** | unused |
| `adminService.updateRoles` | `PUT /admin/roles` | ❌ **GET only** | unused |
| users / deposits / withdrawals review | `/admin/...` | ✅ | ❌ OS/lifecycle |
| trades list / publish | `/admin/trades*` | ✅ | ❌ wrong page mount |
| returns GET/POST | `/admin/returns` | ✅ | ❌ |
| audit | `/admin/audit` | ✅ | ❌ |
| dashboard / activity / ops metrics | `/admin/dashboard` etc. | ✅ | ❌ **no client for dashboard/ops** |
| media / broadcasts / emails / reports admin | services exist | ✅ | ❌ OS |
| payment-methods / wallet-addresses / ledger / wallets adjust | ❌ thin or missing clients | ✅ BE | ❌ |

---

## Unused endpoints

### A. Backend exists — **no frontend client** (selected)

| METHOD | Path | Notes |
|--------|------|-------|
| GET | `/users/me` | Overlaps `/auth/me` |
| GET/PATCH | `/profile` | Avatar, sessions family |
| POST | `/profile/avatar` | |
| GET/DELETE | `/profile/sessions*` | Overlaps `/auth/sessions` |
| GET | `/wallet/history` | |
| GET | `/transactions` | Investor ledger list |
| GET | `/portfolio` | |
| GET | `/returns` | |
| GET | `/performance/yearly` | |
| GET | `/cms/public/announcements`, `/pages/:slug` | |
| PUT/POST | `/cms/landing` autosave/schedule/revisions | |
| CRUD | `/cms/faqs`, `/testimonials`, `/pages`, `/announcements` | |
| GET | `/admin/dashboard` | |
| GET | `/admin/ops/metrics` | |
| PATCH/POST | `/admin/users/:id/*` status actions | Client only has list/get |
| POST | `/admin/deposits\|withdrawals/:id/approve\|reject\|mark-paid` | Client uses `/review` only |
| Full | `/admin/trades` CRUD open/close/cancel/… | Client only list + publish |
| GET | `/admin/performance` | |
| Full | `/admin/wallets`, adjust, payment-methods, wallet-addresses, ledger | |
| Full | `/admin/support/*` assign/close/… | Client list/reply only |
| Full | `/admin/reports` GET/POST/GET:id | UI wrongly uses investor export |
| GET | `/admin/finance/metrics` | |
| GET | `/files/download` | Signed; used via URLs not client helper |
| GET | `/emails/o/:token`, `/c/:token` | Email tracking (email clients) |
| GET | `/csrf`, `/health*`, `/metrics` | Platform (partial) |

### B. Frontend client exists — **no mounted page calls it**

Essentially: `useRegister`, KYC entire service, deposit/withdraw **create**, wallet summary/transactions, all investor trade/performance hooks, `cmsService`, `settingsService`, `mediaService`, `broadcastService`, `emailAdminService`, most `adminService` mutations (`reviewDeposit`, `publishReturn`, `audit`, …), support list/reply, change-password, sessions.

---

## Missing endpoints

### Frontend calls backend that **does not exist**

| METHOD | Client URL | Used by | Impact |
|--------|------------|---------|--------|
| GET | `/api/v1/admin/health` | System health workspace | Always fails → OS fallback |
| GET | `/api/v1/admin/search` | `adminService.search` | Dead |
| GET | `/api/v1/admin/backups` | `adminService.listBackups` | Dead |
| POST | `/api/v1/admin/backups` | `adminService.createBackup` | Dead |
| PUT | `/api/v1/admin/roles` | `adminService.updateRoles` | Dead (GET catalog only) |
| GET | `/api/v1/auth/google` | Login Google button | **404** on production |

### Product gaps (UI expects capability, no API)

| Capability | Notes |
|------------|-------|
| Contact / lead form | No public contact endpoint |
| Referrals | No referrals API; feature flagged off |
| Username login | UI allows; API email-only |

### Wrong endpoint (exists but incorrect for page)

| Page | Calls | Should call |
|------|-------|-------------|
| Admin reports | `POST /reports/export` | `POST /admin/reports` (+ list `GET /admin/reports`) |

---

## Duplicated endpoints

### A. Backend intentional aliases (same handler)

| Pair | Notes |
|------|-------|
| `GET /kyc/status` ≡ `GET /kyc/me` | Same controller |
| `POST /kyc/submit` ≡ `POST /kyc/` | Same |
| `POST /admin/users/:id/delete` ≡ `DELETE /admin/users/:id` | Same |
| `/admin/announcements/*` ≡ `/cms/announcements/*` | Thin alias |
| `GET /api/docs/json` ≡ `/api/openapi.json` | Docs |

### B. Frontend duplicate clients (same path, two wrappers)

| Path | Duplicated by |
|------|----------------|
| `/cms/platform` (+ publish) | `cmsService` + `adminService.getPlatformCms` |
| `/admin/returns` | `adminService.returns` + `reportService.dailyReturnRuns` |
| `/auth/refresh` | `apiClient` internal fetch + `authService.refresh` |
| `/kyc/me` vs `/kyc/status` | Both methods on `kycService` |
| Sessions | `/auth/sessions` vs `/profile/sessions` (different BE, overlapping concern) |
| Deposit/withdraw review | `/review` vs dedicated `/approve` `/reject` `/mark-paid` (BE both; client only `/review`) |

### C. Conceptual dual sources of truth (not HTTP dupes)

Investor Lifecycle + Admin OS localStorage **duplicate** the purpose of `/wallet`, `/deposits`, `/admin/*`, `/cms/*` without calling them — primary production risk.

---

## Retry / timeout / error handling scorecard

| Layer | Retry | Timeout | Error codes surfaced |
|-------|-------|---------|----------------------|
| `apiClient` JSON | 401 TOKEN_EXPIRED once | ❌ none | ✅ mapped to `ApiError` |
| Multipart upload helpers | ❌ no refresh retry | ❌ none | Partial `ApiError` parse |
| React Query queries | ≤2 if not 4xx | N/A | Via `ApiError` |
| React Query mutations | ❌ global off | N/A | Caller toasts |
| Money POSTs | Idempotency-Key when wired | — | Server conflict codes |

---

## Coverage score (strict)

| Lens | Score | Notes |
|------|------:|-------|
| Service paths match real BE | ~95% | Except 5 missing + Google |
| Pages call correct production API | ~15% | Auth + notifications + fragments |
| Admin money/CMS pages → `/admin`+`/cms` | ~0% | Admin OS |
| Investor money pages → finance APIs | ~5% | Wallet GET in withdraw modal only |
| Timeout handling | 0% | Not implemented |
| Permission UI vs API | Poor | API enforces; UI shows all |

---

## Recommended gate (report only — no fixes)

1. Treat **page wiring**, not service file existence, as the coverage bar.  
2. Remove or implement the **5 missing client endpoints** before shipping admin health/search/backups/roles write/Google.  
3. Point admin reports at `/admin/reports`.  
4. Add request **timeouts** and multipart refresh parity.  
5. Do not mark production API coverage green until wallet/deposit/withdraw/KYC/admin queues call the matching methods above.

---

*Generated from static analysis of `apps/web/src/services/*`, `features/*/hooks.ts`, mounted pages, and `apps/api/src/routes/*`. No runtime authenticated traffic capture in this pass.*
