# Growzy — Data Flow

**Audience:** Backend + frontend engineers integrating APIs  
**Mode today:** Demo localStorage / cookies  
**Target:** REST (`API_ROUTES`) + React Query + services

---

## 1. High-level

```
┌──────────────┐     cookies      ┌─────────────┐
│   Browser    │ ───────────────► │ middleware  │  presence guards
└──────┬───────┘                  └─────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ Providers (demo business state)              │
│  InvestorLifecycle · AdminOs · Notifications │
│  Session (null until /auth/me)               │
└──────┬───────────────────────────────────────┘
       │  read/write (today)
       ▼
┌──────────────────────────────────────────────┐
│ localStorage / sessionStorage / demo cookies │
└──────────────────────────────────────────────┘

TARGET:

Components → Feature hooks → services/* → apiClient → apps/api → PostgreSQL
```

---

## 2. Investor flows

| Flow | UI | Demo source | API target |
|------|-----|-------------|------------|
| Register / login | Auth forms | `InvestorLifecycleProvider` | `authService.*` |
| Session | Middleware + `ProtectedRoute` | `mfx_at` cookie | `authService.me` |
| KYC | Onboarding | Lifecycle KYC draft | `kycService.*` |
| Wallet | Wallet Center | Lifecycle wallet | `walletService.*` |
| Deposit / withdraw | Modals | Lifecycle money queues | `depositService` / `withdrawService` |
| Trades / performance | Dashboard | Admin OS published + mocks | `tradeService` / `reportService` |
| Notifications | Sheet / page | `NotificationsProvider` | `notificationService` |
| Support | Support workspace | Admin OS tickets | `supportService` |
| CMS copy | Welcome / wallet titles | `platformCms` in Admin OS | `cmsService.publicBootstrap` |

---

## 3. Admin flows

| Flow | UI | Demo source | API target |
|------|-----|-------------|------------|
| Admin login | Admin login form | `growzy_admin_at` | Admin auth realm |
| Queues | Deposits / KYC / WD | Lifecycle + Admin OS | `adminService.*` |
| Publish trades / returns | Trade / returns OS | Admin OS | `adminService.publish*` |
| CMS publish | Landing / Platform CMS | Admin OS revisions | `cmsService.*` |
| Settings / flags / roles | Settings workspaces | Admin OS | `settingsService` / `adminService.roles` |
| Health / search / activity | New admin pages | Admin OS demo metrics | `adminService.health|search|activity` |
| Audit | Audit Center | Admin OS audit array | `adminService.audit` |

---

## 4. CMS publish path

```
Admin edits draft (AdminOsProvider)
        │
        ▼
Publish → revision snapshot (local)
        │
        ▼
publishedLanding / platformCms
        │
        ▼
Marketing + investor components read published state
```

**Production:** `PUT` draft → `POST` publish → CDN/public `GET /cms/public` bootstrap; revisions in DB.

---

## 5. Money path (production)

```
Client create (idempotency key)
  → API validates limits + feature flags
  → Pending row
  → Admin review
  → Ledger post (transaction + lock)
  → Wallet cache update
  → Notification + email outbox
```

Demo skips ledger integrity — **never ship demo money path**.

---

## 6. Error / loading flow

```
service throws ApiError
  → viewStateFromError()  (@/errors)
  → UI: loading | empty | offline | unauthorized | forbidden | not_found | maintenance
```

---

## 7. Cutover order

1. Auth + session hydrate  
2. Wallet summary  
3. Deposits / withdrawals  
4. CMS public bootstrap  
5. Admin queues  
6. Retire localStorage providers  
