# Demo → Production Cutover Report — Growzy Web

**Date:** 2026-08-05  
**Scope:** Frontend demo-mode removal and production API wiring  
**Constraint:** No UI redesign  

---

## Verdict

Growzy web is cut over from **demo OS** to **production data paths**. Auth, session, notifications, wallets/deposits/withdrawals/trades/admin lists use real API services and React Query hooks. Fixture modules under `apps/web/src/mocks` retain **empty stubs + UI types only** (no sample users, fake balances, or demo credentials). Fake marketing stats/trades/activity are empty until CMS / public APIs publish them.

---

## Removed / neutralized demo features

### Auth & session
| Item | Action |
|------|--------|
| Demo investor credentials (`investor@growzy.com` / `ayesha` / `Growzy2026!`) | Removed from login UI |
| Demo admin credentials (`admin@growzy.com` / `GrowzyAdmin2026!` / OTP `123456`) | Removed (`ADMIN_DEMO` deleted) |
| Demo OTP constant / UI hints (`123456`) | Removed from auth, profile, lifecycle |
| `setDemoSession()` forging `mfx_at=demo` | No-op / deleted; real httpOnly cookie from API |
| `demo-admin-auth.ts` (`growzy_admin_at`) | Deleted; admin uses same `mfx_at` + role check |
| `DemoSession` wrapper injecting `DEMO_SESSION` | Deleted |
| `isDemo` env flag in `app.config.ts` | Removed |
| `DUMMY_AUTH` in `auth-schemas.ts` | Removed |
| Fake OAuth callback (`setDemoSession`) | Uses `authService.me()` |
| Client-side Google demo user (`google.investor@growzy.com`) | Disabled; real OAuth redirect only |

### Notifications
| Item | Action |
|------|--------|
| Seed from `RECENT_NOTIFICATIONS` | Removed |
| `receiveDemo()` fake profit push | Removed |
| sessionStorage demo persistence | Removed |
| Provider | Wired to `notificationService` via feature hooks |

### Money / investor fixtures
| Item | Action |
|------|--------|
| Fake wallet `$12,480.75` / `$10,000` invested | Zeroed; UI uses session/wallet hooks with `0.00` fallback |
| `DEMO_DEPOSITS` / `DEMO_WITHDRAWALS` / `DEMO_LEDGER` | Empty arrays |
| `DEMO_DAILY_RETURNS` / `DEMO_MONTHLY_RETURNS` | Empty arrays |
| Sample saved banks / crypto wallets | Empty arrays |
| Demo deposit crypto addresses | Cleared |
| Deposit/withdraw history panels | Wired to `useDeposits` / `useWithdrawals` |

### Admin fixtures
| Item | Action |
|------|--------|
| Sample investors (Ayesha, etc.) | Emptied |
| Sample deposits / withdrawals / trades / audit / staff | Emptied |
| “Generate demo activity” button | Removed |
| Fake system health metrics (`0.1.0-demo`, Mailhog, etc.) | Empty metrics; environment `production` |
| Demo payment wallet addresses (`TXyzGrowzy…`) | Removed from Admin OS defaults |
| Sample support tickets / user timelines | Emptied |
| “(demo)” toast suffixes | Stripped across admin/investor surfaces |

### Marketing / live fake feeds
| Item | Action |
|------|--------|
| `LANDING_STATS` fake AUM / investor counts | Empty |
| `SAMPLE_TRADES` / `LIVE_TRADE_POOL` / `LIVE_ACTIVITY` | Empty; live preview uses CMS published trades only |
| `FOREX_TICKER` / `TESTIMONIALS` / fake distributions / hubs | Empty |
| `MONTHLY_RETURNS` / `YEARLY_RETURNS` fake series | Empty |
| Hardcoded `$10,000` portfolio preview path | No longer seeded via mocks |

### Admin OS localStorage defaults
| Item | Action |
|------|--------|
| Seeded fake trades from `SAMPLE_TRADES` | `[]` |
| Seeded ticker / performance % / INR+crypto rails | Empty / zeros |
| Fake activity names & seed feed | Disabled / empty |
| Fake announcements & testimonials | Empty |

---

## Replaced with production APIs

| Area | Production path |
|------|-----------------|
| Login / register / logout / forgot / reset / verify | `authService` + `features/auth/hooks` |
| Session hydration | `GET /auth/me` via `SessionProvider` + `useAuthSession` |
| Route guards | Cookie `mfx_at` presence (middleware) + `useSession` role checks |
| Wallet / summary / ledger | `walletService` + `features/wallet/hooks` |
| Deposits / withdrawals | `depositService` / `withdrawService` + feature hooks |
| Trades (investor + public + admin) | `tradeService` / `adminService` + feature hooks |
| Performance / exports | `reportService` + `features/performance/hooks` |
| Notifications | `notificationService` + hooks + provider |
| Admin health / users / money queues / audit / activity | `adminService` + `features/admin/hooks` |
| CMS bootstrap | `cmsService.publicBootstrap` + `features/cms/hooks` |
| Google OAuth | Redirect to `API_ROUTES.auth.google` |

---

## Production environment variables (verified in code)

Public web (`apps/web/src/lib/env.ts`):
- `NEXT_PUBLIC_API_URL` — required HTTPS, **rejects localhost in production**
- `NEXT_PUBLIC_SITE_URL` — required HTTPS, **rejects localhost in production**
- `NEXT_PUBLIC_PLATFORM_NAME`, `NEXT_PUBLIC_SUPPORT_EMAIL`
- `NEXT_PUBLIC_ENABLE_REFERRALS`, `NEXT_PUBLIC_ENABLE_ROUTE_GUARDS`

No `NEXT_PUBLIC_DEMO` / `USE_MOCK` / `isDemo` flags remain.

API production guards already reject placeholder JWT secrets and localhost CORS where configured (`apps/api` env). Render Blueprint continues to inject production URLs (`render.yaml`).

---

## Intentionally retained (not demo money)

- Structural marketing copy (`HOW_IT_WORKS`, `WHY_CHOOSE_US`, `PLATFORM_FEATURES`) — non-numeric product copy; live stats/trades come from CMS/API when published
- Email HTML **preview** sample fields in `premium-email-templates.ts` (template designer only)
- Local Admin OS draft store for CMS editing until publish (defaults empty; not seeded with fake P&L)
- Investor lifecycle provider remains as a transitional local UX layer for some KYC/money flows still calling into it — **no DEMO_OTP, no seeded demo user, no forged session cookie**; new screens should prefer feature hooks

---

## Verification

| Check | Result |
|-------|--------|
| `pnpm --filter @meridian/web typecheck` | Pass |
| Demo credentials / OTP / `ADMIN_DEMO` / `isDemo` / `receiveDemo` / `generateActivityDemo` | Not present in product code |
| `@/mocks` | Empty stubs only |

---

## Follow-ups (recommended)

1. Finish replacing remaining `useInvestorLifecycle` money mutations with deposit/withdraw/kyc service mutations end-to-end.
2. Load Admin OS CMS draft/publish exclusively from `cmsService` (drop localStorage persistence in production builds).
3. Wire marketing FAQs/testimonials exclusively from `useCmsBootstrap`.
4. Clear browser `localStorage` keys `growzy_admin_os_v4` / `growzy_investor_lifecycle_v2` for operators who previously used demo mode.
5. Commit & deploy web + confirm Render env vars match `env.render.example`.
