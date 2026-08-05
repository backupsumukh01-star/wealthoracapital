# Production E2E QA Checklist — Growzy

**Date:** 2026-08-05  
**Mode:** Report only — **no fixes applied**  
**Environments checked:**
- Production web: `https://growzycapital.com` (pages smoke)
- Production API: `https://api.growzycapital.com` (health + public routes)
- Local API: `http://localhost:4000/api/health` (up)
- Local web: `http://localhost:3000` (**down** during this pass)
- Codebase: current workspace (includes uncommitted demo-cutover WIP)

**Method:** Production HTTP smoke + full code walkthrough of routes, forms, hooks, and API clients. Interactive authenticated clicks (real deposit/KYC approve with live money) were **not** executed — no operator credentials / no browser automation MCP in this session.

**Legend**

| Symbol | Meaning |
|--------|---------|
| ✅ | Pass |
| ⚠️ | Partial / caveat |
| ❌ | Fail |
| 🚫 | Blocked / not implemented |
| — | Not exercised live (auth-gated or no interactive session) |

**Per-row columns:** API req · API resp · Validation · Errors · Loading · Success msg · Mobile · Desktop

---

## Executive verdict

**Not production-ready for live investor money or admin operations.**

| Layer | Verdict |
|-------|---------|
| Marketing pages (HTTP) | Mostly reachable |
| Auth API (login / forgot / reset / verify / logout) | Largely wired |
| Investor money / KYC / dashboard | Still `InvestorLifecycle` / localStorage / Admin OS |
| Admin ops console | Almost entirely Admin OS / lifecycle — success toasts without DB effect |
| Dual session | Real `SessionProvider` gates routes; money UX often reads lifecycle → empty/locked after real login |

**Production smoke (unauthenticated)**

| Check | Result |
|-------|--------|
| Homepage `/` | 200 |
| Login / register / forgot / reset / verify / contact | 200 |
| Admin login | 200 |
| Protected investor + admin routes | **307** → login (middleware OK) |
| `GET /api/health`, `/ready` | 200 |
| `GET /api/v1/csrf` | 200 |
| `GET /api/v1/cms/public` | 200 (has payload) |
| `GET /api/v1/settings/public` | 200 |
| `GET /api/v1/performance/public` | 200 |
| `GET /api/v1/trades/public` | 200 (thin/empty payload) |
| `GET /api/v1/auth/google` | **404** |

---

## P0 issues (block go-live)

1. **Registration does not call API** — `register-form.tsx` uses `registerAccount` from `InvestorLifecycleProvider` + fake `wait(700)`; `useRegister` unused.
2. **KYC / onboarding is demo** — `onboarding-wizard.tsx` → lifecycle `submitKyc`; no upload/submit to `/kyc/*`.
3. **Wallet / deposit / withdraw submits are demo** — modals/workspaces use lifecycle; feature hooks unused (history panels are an API island only).
4. **Dashboard / trades / performance / transactions** — lifecycle + Admin OS localStorage; dashboard page comment still says “Dummy data only.”
5. **Admin money & identity actions are fake** — KYC approve/reject, deposit/withdraw decisions, daily return publish, wallet adjust toast success without `/v1/admin/*` mutations.
6. **Admin CMS / settings / broadcasts / audit** — Admin OS (`growzy_admin_os_v5`) localStorage, not CMS/settings/broadcast/audit APIs.
7. **Admin trades page mounts Admin OS**, not API-backed trades workspace (`admin/trades/page.tsx` → `AdminTradeOsWorkspace`).
8. **Google OAuth broken** — UI links to `/auth/google`; production API returns **404**.
9. **Dual-session split** — real login via `mfx_at` + `/auth/me`, but investor money UI often binds lifecycle → production users see locked/empty balances.
10. **False operator success** — admin toasts imply ledger/KYC/CMS changes that never hit the database.

---

## P1 issues

| ID | Issue |
|----|-------|
| P1-1 | Password policy mismatch: web allows passwords without special chars; API requires them (register when wired, reset/change). |
| P1-2 | Login UI “Email / Username”; API accepts **email only**. |
| P1-3 | Marketing `AuthModal` still uses lifecycle (homepage CTAs ≠ `/login` API path). |
| P1-4 | Contact form: fake `setTimeout` success — no lead/API. |
| P1-5 | Homepage many sections still fed by emptied mocks / Admin OS — thin or empty marketing content. |
| P1-6 | Admin RBAC UI absent — `PermissionGate` unused; every admin sees full nav (API would 403). |
| P1-7 | Reports UI uses investor `POST /reports/export` (forced investor scope) instead of `/admin/reports`. |
| P1-8 | Client expects missing admin routes: `/admin/health`, `/admin/search`, `/admin/backups`, roles PUT. |
| P1-9 | CSRF: cookie set on login; no dedicated SPA CSRF bootstrap before first mutation (cross-origin cookie domain must be correct). |
| P1-10 | Referrals page stubbed; `NEXT_PUBLIC_ENABLE_REFERRALS=false` — no referrals API. |
| P1-11 | Support ticket create is API-wired; live chat widget is demo (“Hi Ayesha…”); FAQ emptied. |
| P1-12 | Settings (profile/security/payouts/preferences/emails) mostly lifecycle or local toast “saved”. |
| P1-13 | `rememberMe` collected on login, never sent to API. |
| P1-14 | Uncommitted demo-cutover WIP overstates readiness vs mounted UI (`DEMO_TO_PRODUCTION_REPORT.md` vs code). |

---

## Investor flow checklist

### Homepage `/`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ⚠️ | Public CMS/performance/trades APIs exist; many UI sections still mocks/Admin OS |
| API response | ⚠️ | Prod CMS public 200; trades public thin |
| Validation | — | N/A for browse |
| Error handling | ⚠️ | Limited empty-state for emptied fixtures |
| Loading | ✅ | Dynamic import skeletons present |
| Success message | ❌ | Contact form fakes success |
| Mobile | ⚠️ | Layout OK; content may look empty |
| Desktop | ⚠️ | Same |
| **Overall** | **⚠️ PARTIAL** | |

- [ ] Hero CTA opens real register/login (not demo AuthModal)
- [ ] CMS-driven hero/FAQ/ticker from API only
- [ ] Contact submits to backend

---

### Registration `/register`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Lifecycle only — no `POST /auth/register` |
| API response | ❌ | N/A |
| Validation | ⚠️ | Client zod OK; weaker than API password rules |
| Error handling | ⚠️ | Toast on throw only |
| Loading | ⚠️ | `isSubmitting` + fake delay |
| Success message | ⚠️ | Toast + navigate; no real email |
| Mobile | ✅ | Form layout OK |
| Desktop | ✅ | |
| **Overall** | **❌ FAIL** | |

- [ ] Uses `useRegister` / `authService.register`
- [ ] Password policy matches API
- [ ] Google button not broken / removed until OAuth exists

---

### Email verification `/verify-email`, `/verify-email/sent`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ✅ | `useVerifyEmail` / resend hooks |
| API response | ✅ | Error alert + ApiError |
| Validation | ⚠️ | Token from query |
| Error handling | ✅ | |
| Loading | ✅ | LoadingScreen |
| Success message | ✅ | SuccessState |
| Mobile | ✅ | |
| Desktop | ✅ | |
| **Overall** | **⚠️ PARTIAL** | Broken end-to-end until register creates real users |

- [ ] Register → email → verify works against prod mail transport

---

### Login `/login`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ✅ | `useLogin` → `POST /auth/login` |
| API response | ✅ | |
| Validation | ⚠️ | Username path invalid server-side |
| Error handling | ✅ | ErrorDialog + unverified redirect |
| Loading | ✅ | |
| Success message | ✅ | Toast |
| Mobile | ✅ | |
| Desktop | ✅ | |
| **Overall** | **⚠️ PARTIAL** | Google 404; marketing modal still demo |

- [ ] Google OAuth live or UI removed
- [ ] Username removed or API supports it

---

### Forgot password `/forgot-password`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ✅ | |
| API response | ✅ | Enumeration-safe |
| Validation | ✅ | |
| Error handling | ⚠️ | Generic toast |
| Loading | ✅ | |
| Success message | ✅ | Success UI |
| Mobile | ✅ | |
| Desktop | ✅ | |
| **Overall** | **✅ PASS** | (needs live email delivery check) |

- [ ] Reset email arrives in production mail provider

---

### Reset password `/reset-password`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ✅ | |
| API response | ✅ | |
| Validation | ⚠️ | Client weaker than API |
| Error handling | ⚠️ | Some errors swallowed then alert |
| Loading | ✅ | |
| Success message | ✅ | → login `?reset=1` |
| Mobile | ✅ | |
| Desktop | ✅ | |
| **Overall** | **✅ PASS** | with policy caveat |

---

### Dashboard `/dashboard`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Wealth home / lifecycle / Admin OS |
| API response | ❌ | |
| Validation | — | |
| Error handling | ❌ | No API error/retry |
| Loading | ⚠️ | Artificial boot skeleton |
| Success message | — | |
| Mobile | ⚠️ | Bottom nav OK; FAB risk |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | Page: “Dummy data only.” |

---

### Profile `/settings/profile`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Lifecycle preferred |
| API response | ❌ | |
| Validation | ⚠️ | |
| Error handling | ⚠️ | |
| Loading | ⚠️ | |
| Success message | ⚠️ | Local toasts |
| Mobile | ✅ | Tab scroll |
| Desktop | ✅ | |
| **Overall** | **❌ FAIL** | |

---

### KYC `/onboarding`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Lifecycle `submitKyc` |
| API response | ❌ | No document upload API |
| Validation | ⚠️ | Wizard steps only |
| Error handling | ⚠️ | |
| Loading | ⚠️ | Fake wait |
| Success message | ⚠️ | Local |
| Mobile | ✅ | |
| Desktop | ✅ | |
| **Overall** | **❌ FAIL** | |

---

### Deposit (wallet modal / `/deposit`)

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Submit lifecycle; history panel uses API |
| API response | ❌ | Empty demo bank/crypto addresses after stub |
| Validation | ⚠️ | Minimal |
| Error handling | ❌ | |
| Loading | ⚠️ | |
| Success message | ⚠️ | Local toast |
| Mobile | ⚠️ | Modal + bottom nav |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | |

---

### Withdrawal

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Same pattern as deposit |
| API response | ❌ | Empty destinations |
| Validation | ⚠️ | |
| Error handling | ❌ | |
| Loading | ⚠️ | Partial `useWallet` balance only |
| Success message | ⚠️ | Local |
| Mobile | ⚠️ | |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | |

---

### Wallet `/wallet`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Balances from lifecycle |
| API response | ❌ | |
| Validation | — | |
| Error handling | ❌ | |
| Loading | ⚠️ | |
| Success message | — | |
| Mobile | ⚠️ | |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | |

---

### Trading `/trades`, `/trades/[id]`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Admin OS published trades |
| API response | ❌ | Invented P/L in places |
| Validation | — | |
| Error handling | ❌ | |
| Loading | ⚠️ | Fake delay |
| Success message | — | |
| Mobile | ⚠️ | |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | |

---

### Portfolio `/my-performance`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Lifecycle returns |
| API response | ❌ | CSV export of local data |
| Validation | — | |
| Error handling | ❌ | |
| Loading | ⚠️ | |
| Success message | — | |
| Mobile | ⚠️ | |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | |

---

### Transactions `/transactions`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Lifecycle (history panels PARTIAL) |
| API response | ❌ | |
| Validation | — | |
| Error handling | ❌ | |
| Loading | ⚠️ | |
| Success message | — | |
| Mobile | ⚠️ | |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | |

---

### Referrals `/referrals`

| Check | Status | Notes |
|-------|--------|-------|
| API request | 🚫 | No referrals API |
| API response | 🚫 | |
| Validation | — | |
| Error handling | — | Stub page |
| Loading | — | |
| Success message | — | |
| Mobile | ✅ | |
| Desktop | ✅ | |
| **Overall** | **🚫 BLOCKED** | Feature flag off |

---

### Support `/support`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ⚠️ | Ticket create API; chat demo |
| API response | ⚠️ | |
| Validation | ⚠️ | Trim only |
| Error handling | ⚠️ | |
| Loading | ✅ | On ticket submit |
| Success message | ✅ | Toast on ticket |
| Mobile | ⚠️ | Chat dense |
| Desktop | ⚠️ | |
| **Overall** | **⚠️ PARTIAL** | |

---

### Notifications `/notifications`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ✅ | Provider → feature hooks |
| API response | ✅ | Optimistic mark-read |
| Validation | — | |
| Error handling | ⚠️ | CSRF/cookie domain dependent |
| Loading | ✅ | |
| Success message | ⚠️ | Implicit |
| Mobile | ✅ | Sheet/bell |
| Desktop | ✅ | |
| **Overall** | **✅ PASS*** | *verify CSRF on cross-origin prod |

---

### Settings (security / payouts / preferences / emails)

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Lifecycle / local state / demo email studio |
| API response | ❌ | |
| Validation | ⚠️ | |
| Error handling | ⚠️ | |
| Loading | ⚠️ | |
| Success message | ❌ | “Saved” without API |
| Mobile | ✅ | |
| Desktop | ✅ | |
| **Overall** | **❌ FAIL** | |

---

### Logout (user menu)

| Check | Status | Notes |
|-------|--------|-------|
| API request | ✅ | `useLogout` |
| API response | ✅ | |
| Validation | — | |
| Error handling | ⚠️ | Swallow then redirect |
| Loading | ⚠️ | No pending disable on item |
| Success message | — | Redirect |
| Mobile | ✅ | |
| Desktop | ✅ | |
| **Overall** | **✅ PASS** | |

---

## Admin flow checklist

### Admin login `/admin/login`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ✅ | Shared `/auth/login` + role check |
| API response | ✅ | Non-admin logged out |
| Validation | ✅ | |
| Error handling | ✅ | |
| Loading | ✅ | |
| Success message | ✅ | |
| Mobile | ✅ | |
| Desktop | ✅ | |
| **Overall** | **✅ PASS** | |

---

### Admin dashboard `/admin`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Admin OS + lifecycle KPIs |
| API response | ❌ | `/admin/dashboard` unused |
| Validation | — | |
| Error handling | ❌ | |
| Loading | ⚠️ | Local ready |
| Success message | — | |
| Mobile | ⚠️ | Dense |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | |

---

### Users `/admin/users`, `/admin/users/[id]`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Lifecycle / `ADMIN_INVESTORS` fallback |
| API response | ❌ | `useAdminUsers` unused |
| Validation | ⚠️ | |
| Error handling | ❌ | False success toasts |
| Loading | ⚠️ | |
| Success message | ❌ | Toast without API |
| Mobile | ⚠️ | Wide tables |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | |

---

### KYC review `/admin/kyc`, `/admin/kyc/[userId]`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Lifecycle |
| API response | ❌ | Demo docs |
| Validation | ⚠️ | Reason fields local |
| Error handling | ❌ | |
| Loading | ⚠️ | |
| Success message | ❌ | Toast unlocks demo only |
| Mobile | ⚠️ | |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | **P0 money/identity** |

---

### Deposits `/admin/deposits`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Lifecycle; copy admits demo |
| API response | ❌ | |
| Validation | ⚠️ | |
| Error handling | ❌ | |
| Loading | ⚠️ | |
| Success message | ❌ | |
| Mobile | ⚠️ | |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | **P0** |

---

### Withdrawals `/admin/withdrawals`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Same |
| API response | ❌ | |
| Validation | ⚠️ | |
| Error handling | ❌ | |
| Loading | ⚠️ | |
| Success message | ❌ | |
| Mobile | ⚠️ | |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | **P0** |

---

### Trading `/admin/trades`, new, detail, daily return

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Admin OS mounted; API workspace orphaned |
| API response | ❌ | Daily return hardcoded demo day |
| Validation | ⚠️ | Confirm phrase local |
| Error handling | ❌ | |
| Loading | ⚠️ | |
| Success message | ❌ | |
| Mobile | ⚠️ | |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | **P0** |

---

### CMS (landing / content / media / site / platform / backup)

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Admin OS; `cmsService` unused |
| API response | ❌ | Backup client expects missing `/admin/backups` |
| Validation | ⚠️ | |
| Error handling | ❌ | |
| Loading | ⚠️ | |
| Success message | ❌ | Publish = localStorage |
| Mobile | ⚠️ | |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | |

---

### Broadcasts `/admin/broadcast`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Explicit demo alert |
| API response | ❌ | |
| Validation | ⚠️ | |
| Error handling | ❌ | |
| Loading | ⚠️ | |
| Success message | ❌ | “Broadcast sent” fake |
| Mobile | ⚠️ | |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | |

---

### Reports `/admin/reports`, `/admin/report-library`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Wrong export path / OS library |
| API response | ❌ | Investor scope forced |
| Validation | ⚠️ | |
| Error handling | ⚠️ | Some catch on export |
| Loading | ⚠️ | |
| Success message | ⚠️ | |
| Mobile | ⚠️ | |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | |

---

### Audit logs `/admin/audit-log`

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Admin OS `state.audit` |
| API response | ❌ | `useAdminAudit` unused |
| Validation | — | |
| Error handling | ❌ | |
| Loading | ⚠️ | |
| Success message | — | CSV of local rows |
| Mobile | ⚠️ | |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | |

---

### System settings (global / general / platform / email / security / roles / payments / staff)

| Check | Status | Notes |
|-------|--------|-------|
| API request | ❌ | Local / Admin OS; settingsService unused |
| API response | ❌ | Roles PUT missing on API |
| Validation | ⚠️ | |
| Error handling | ❌ | |
| Loading | ⚠️ | |
| Success message | ❌ | Toast without persistence |
| Mobile | ⚠️ | |
| Desktop | ⚠️ | |
| **Overall** | **❌ FAIL** | |

---

### Other admin surfaces (notifications, emails, announcements, wallets, support, toggles, ticker, performance, health, search)

| Surface | Overall | Notes |
|---------|---------|-------|
| Notifications | ❌ | Admin OS campaigns |
| Emails / templates | ❌ | Lifecycle/OS; services unused |
| Announcements | ❌ | Admin OS |
| Wallets adjust | ❌ | **P0** fake money |
| Support | ❌ | Admin OS tickets |
| Feature toggles | ❌ | Admin OS |
| Ticker / performance CMS | ❌ | Admin OS |
| System health | ⚠️ | Calls missing `/admin/health` → error + OS fallback |
| Search | ❌ | Client-side OS/lifecycle scan |

---

## Scorecard

| Flow | Status |
|------|--------|
| Homepage | ⚠️ PARTIAL |
| Registration | ❌ FAIL |
| Email verification | ⚠️ PARTIAL |
| Login | ⚠️ PARTIAL |
| Forgot password | ✅ PASS |
| Reset password | ✅ PASS |
| Dashboard | ❌ FAIL |
| Profile | ❌ FAIL |
| KYC | ❌ FAIL |
| Deposit | ❌ FAIL |
| Withdrawal | ❌ FAIL |
| Wallet | ❌ FAIL |
| Trading | ❌ FAIL |
| Portfolio | ❌ FAIL |
| Transactions | ❌ FAIL |
| Referrals | 🚫 BLOCKED |
| Support | ⚠️ PARTIAL |
| Notifications | ✅ PASS* |
| Settings | ❌ FAIL |
| Logout | ✅ PASS |
| Admin login | ✅ PASS |
| Admin dashboard | ❌ FAIL |
| Users | ❌ FAIL |
| KYC review | ❌ FAIL |
| Deposits | ❌ FAIL |
| Withdrawals | ❌ FAIL |
| Trading / returns | ❌ FAIL |
| CMS | ❌ FAIL |
| Broadcasts | ❌ FAIL |
| Reports | ❌ FAIL |
| Audit logs | ❌ FAIL |
| System settings | ❌ FAIL |

**Counts:** ✅ ~5 · ⚠️ ~5 · ❌ ~22 · 🚫 1

---

## Manual follow-up still required (interactive)

These were **not** completed with a live authenticated browser session in this pass:

- [ ] Register real user → receive email → verify → complete KYC with real uploads
- [ ] Deposit proof upload → admin approve → wallet credit in DB
- [ ] Withdrawal → admin mark-paid → ledger debit
- [ ] Admin publish CMS → verify on a second device/browser (not localStorage)
- [ ] CSRF cookie readable on `growzycapital.com` calling `api.growzycapital.com`
- [ ] Mobile device lab (iOS Safari / Android Chrome) for wallet FAB + bottom nav
- [ ] Desktop responsive tables on admin queues

---

## Gate recommendation

**Do not open production capital** until P0 items are resolved: wire investor + admin money/KYC/CMS mutations to real APIs, remove dual-session lifecycle override from money paths, fix or remove Google OAuth, and stop success toasts that do not reflect database state.

*Report only — no code changes made for this QA pass.*
